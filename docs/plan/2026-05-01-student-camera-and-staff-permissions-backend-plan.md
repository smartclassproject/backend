# Backend Plan: Student Camera Capture Support + Staff Access Fixes

## Goal

Resolve production blockers reported by `school_staff` and support camera-based student photo upload from web/mobile:

1. `school_staff` with relevant modules should access majors/classes/attendance read APIs.
2. Student profile images should load without browser blocking on HTTPS frontend.
3. Existing student photo upload endpoint should support camera-captured files without API contract changes.

## Reported Problems

1. `GET /api/majors/school/majors?page=1&limit=10` -> `403 Access denied`.
2. `GET /api/classes` -> `403 Access denied`.
3. `GET /api/attendance/school/attendance?page=1&limit=10` -> `403 Access denied`.
4. Student/staff profile images loaded from `http://41.186.188.119:5000/uploads/...` are blocked on HTTPS frontend (mixed content).

## Root Cause Analysis

### A) Majors API access mismatch

File: `backend/routes/majors.js`

- `GET /school/majors` currently allows only `school_admin`.
- `school_staff` role is excluded even when modules include `courses` (or `students` for dependent read use cases).

### B) Classes API access mismatch

File: `backend/routes/classes.js`

- `GET /api/classes` currently allows only `school_admin`, `teacher`.
- `school_staff` is excluded from class lookup APIs required by student registration/import/dependencies.

### C) Attendance school list access mismatch

File: `backend/routes/attendance.js`

- `GET /school/attendance` currently allows only `school_admin`.
- `school_staff` with relevant module (`reports` and/or `students`) cannot access attendance list.

### D) Image mixed-content blocking

- Frontend is served on HTTPS.
- Image URLs are absolute HTTP backend URLs (`http://.../uploads/...`), blocked by browser.
- Existing API mixed-content mitigation was added for `/api/*`, but image/static path delivery must follow the same same-origin strategy.

## Proposed Backend Changes

## 1) Role + module authorization updates

### Majors read endpoints

- Update majors read route authorization to include `school_staff`.
- Enforce module-aware read access with middleware:
  - preferred module: `courses`
  - allow dependency-read fallback where needed by student workflow (`students`), per existing cross-module policy.

Target endpoints:

- `GET /api/majors/school/majors`
- `GET /api/majors/majors/:id` (if needed by UI flows)

### Classes read endpoints

- Allow `school_staff` on class read routes:
  - `GET /api/classes`
  - `GET /api/classes/:id`
- Add module guard:
  - primary: `courses`
  - optional fallback for student-dependent lookups: `students`.

### Attendance read endpoints

- Allow `school_staff` on:
  - `GET /api/attendance/school/attendance`
  - optionally related read endpoints (`/statistics`, `/export/pdf`) based on product policy.
- Add module guard:
  - primary: `reports`
  - fallback: `students` if attendance is required in student-facing flows.

## 2) School-scope enforcement

- Ensure controller queries for the above endpoints continue restricting data by `req.user.schoolId` for non-super-admin users.
- Confirm no cross-school leakage when enabling `school_staff`.

## 3) Static image delivery compatibility

- Keep upload APIs unchanged (multipart image upload already supported).
- Ensure static assets can be served behind HTTPS frontend proxy path:
  - backend must reliably serve `/uploads/*`.
- Validate CORS/static middleware settings do not block proxied asset requests.

## 4) Contract stability

- No request payload change for photo upload endpoints.
- No response schema breaking changes; only authorization expansion for allowed roles/modules.

## Security Rules

- Never grant broad write access to `school_staff` for majors/classes/attendance unless explicitly intended.
- Apply least privilege:
  - read-only endpoints expanded for staff
  - write endpoints remain `school_admin` (unless separately approved).
- Module checks remain server-side source of truth.

## Testing Plan

1. Login as `school_staff` with modules including `courses` and verify:
   - `GET /api/majors/school/majors` returns 200.
   - `GET /api/classes` returns 200.
2. Login as `school_staff` with modules excluding required modules -> still 403.
3. Login as `school_staff` with `reports` and verify:
   - `GET /api/attendance/school/attendance` returns 200.
4. Verify school scoping:
   - data returned only for own school.
5. Verify image URLs through frontend HTTPS host no longer trigger mixed-content block.

## Delivery Phases

### Phase 1 (must-have)

- Authorization fixes for majors/classes/attendance read endpoints.
- Static asset serving verification for proxied `/uploads/*`.

### Phase 2 (should-have)

- Centralize dependency-read policy in middleware helper to reduce per-route duplication.
- Add integration tests for role+module matrices.

## Acceptance Criteria

1. `school_staff` with correct modules can load majors/classes/attendance without 403.
2. `school_staff` without required modules still receives 403.
3. Student images load over HTTPS frontend without browser mixed-content blocking.
4. No cross-school data leak introduced by expanded read access.
