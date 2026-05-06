# Backend Plan: Allow `school_staff` to Create/Update/Delete Courses

## Goal

Let authenticated `school_staff` users who have the `courses` module successfully call write endpoints on `/api/courses`, matching product expectation that module grants apply to CRUD—not only reads.

## Observed Behavior

- Login succeeds for `school_staff` with `modules` including `courses` (e.g. `staffRole: DIRECTOR_OF_STUDIES`).
- `POST https://…/api/courses` returns **403** with message: `Access denied - insufficient permissions`.

## Root Cause

File: `backend/routes/courses.js`

| Method | Route        | Current middleware chain                         | Issue                                              |
|--------|--------------|--------------------------------------------------|----------------------------------------------------|
| GET    | `/`          | `authenticateToken`, `requireModuleAccess('courses')` | Staff allowed                                      |
| GET    | `/:id`       | same + `authorizeResourceAccess(Course)`         | Staff allowed                                      |
| POST   | `/`          | `authorizeRoles('school_admin')`, `requireModuleAccess('courses')` | **`school_staff` rejected before module check**    |
| PUT    | `/:id`       | same                                             | Same                                               |
| DELETE | `/:id`       | same                                             | Same                                               |

`authorizeRoles` only lists `school_admin`, so `school_staff` never reaches `requireModuleAccess('courses')`.

The controller already treats staff like admins for school scoping when validating `majorId`:

- File: `backend/controllers/courses.js` — `createCourse` checks `(school_admin || school_staff)` against `major.schoolId`.

So domain logic expects staff participation; the route layer contradicts it.

## Proposed Backend Changes

### 1) Align write routes with read policy

For **POST**, **PUT**, and **DELETE** on `/api/courses`:

- Replace `authorizeRoles('school_admin')` with `authorizeRoles('school_admin', 'school_staff')`.
- Keep `requireModuleAccess('courses')` immediately after (order preserved: authenticate → role → module).

Effect:

- `school_admin`: unchanged (module middleware bypasses module list for admin—see `requireModuleAccess` in `backend/middlewares/auth.js`).
- `school_staff`: allowed only if `courses` is in `req.user.modules` (from JWT / loaded user).

### 2) Optional product tightening (only if required later)

If product owners want **only certain** `staffRole` values (e.g. `DIRECTOR_OF_STUDIES`) to mutate courses:

- Add middleware such as `requireStaffRoles('DIRECTOR_OF_STUDIES', …)` or map “course write” to an explicit capability list.
- Default recommendation for this fix: **do not** add `staffRole` gates unless there is a documented policy; module grants already encode intent (`ROLE_DEFAULT_MODULES` in `backend/controllers/staff.js` ties `DIRECTOR_OF_STUDIES` to `courses`).

### 3) Swagger / API docs

Update response examples for 403 on POST/PUT/DELETE in `backend/routes/courses.js` where they still say “School admin role required.” After the change, 403 may also mean missing `courses` module (different message from `requireModuleAccess`).

### 4) Regression checks

- `school_staff` **without** `courses` module: must still get 403 (from `requireModuleAccess`).
- `school_staff` **with** `courses` module: POST succeeds when payload is valid and major belongs to same school.
- `school_admin`: unchanged behavior.
- `authorizeResourceAccess(Course)` on GET `/:id`—confirm DELETE/PUT still enforce school boundary via controller or resource middleware (spot-check `deleteCourse` / `updateCourse`).

### 5) Consistency audit (follow-up, optional)

Other resources may show the same pattern (read allows staff + module, write admin-only). Examples already seen: `backend/routes/classes.js` POST uses `school_admin` only. Schedule a separate pass if staff should manage classes/courses/schedules uniformly.

## Acceptance Criteria

1. `POST /api/courses` with valid Bearer token for `school_staff` + `courses` module returns **201** when validation passes.
2. Same user receives **403** with missing-module messaging if `courses` is removed from their assignment.
3. OpenAPI descriptions for courses mutations reflect staff + module behavior.

## Implementation Touchpoints

- `backend/routes/courses.js` — POST, PUT, DELETE `authorizeRoles` arguments.
- `backend/routes/courses.js` — Swagger comment blocks for 403 messaging (optional but recommended).
