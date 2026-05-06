# Backend Plan: Teacher Access to School Student List (and Optional Detail)

## Problem

Teachers calling:

`GET /api/students/students?page=1&limit=1000`

receive:

```json
{ "success": false, "message": "Access denied - insufficient permissions" }
```

despite being authenticated.

## Root Cause

File: `backend/routes/students.js`

```javascript
router.get('/students',
  authorizeRoles('school_admin', 'teacher', 'school_staff'),
  requireModuleAccess('students'),
  studentController.getMySchoolStudents);
```

`authorizeRoles` includes **`teacher`**, but **`requireModuleAccess`** only bypasses the module check for **`super_admin`** and **`school_admin`**. Any other role must be **`school_staff`** with the `students` module; **`teacher` is not `school_staff`**, so the middleware returns **403** with exactly `Access denied - insufficient permissions`.

This matches `backend/middlewares/auth.js` (`requireModuleAccess`).

## Existing Controller Behavior (Already Correct for Teachers)

File: `backend/controllers/students.js` — `getMySchoolStudents`

- Builds `query.schoolId = req.user.schoolId`.
- For **`teacher`** with **`teacherId`**, restricts to students whose **`majorId`** is in the set of majors derived from **courses assigned via `CourseSchedule`** for that teacher.
- If the teacher has no assigned courses, returns an empty list (not an error).

So **no change is required in list logic** once the route lets teachers through.

## Proposed Backend Changes

### 1) Fix `GET /api/students/students` middleware chain

Replace:

- `requireModuleAccess('students')`

with:

- **`requireModuleAccessForSchoolStaff('students')`**

already implemented in `backend/middlewares/auth.js` for schedules/courses patterns: **`school_staff`** still needs the `students` module; **`teacher`** (and **`school_admin`**) passes without a module array.

Ensure `students.js` imports `requireModuleAccessForSchoolStaff` from `../middlewares/auth`.

### 2) Swagger / comments

Update the route comment above `GET /students` that still says “School Admin Only” / “Only school admins” to reflect **school admin, school staff (with module), and teachers**.

### 3) Optional follow-up: `GET /api/students/students/:id` for teachers

Today:

```javascript
router.get('/students/:id',
  authorizeRoles('school_admin', 'super_admin', 'school_staff'),
  requireModuleAccess('students'),
  studentController.getStudentById);
```

**Teachers are omitted.** If the teacher portal loads a single student by id (detail drawer, attendance, etc.), add:

- **`teacher`** to `authorizeRoles`.
- **`requireModuleAccessForSchoolStaff('students')`** instead of `requireModuleAccess('students')`.

**Important:** `getStudentById` currently **does not** enforce school or “teacher may only see students in their majors.” Before exposing this to teachers, add controller checks:

1. Student belongs to **`req.user.schoolId`**.
2. Student’s **`majorId`** is allowed for this teacher (same major-resolution logic as `getMySchoolStudents`: distinct `courseId` from `CourseSchedule` for `teacherId`, then distinct `majorId` from `Course`).

Consider extracting a small helper (e.g. `getTeacherAllowedMajorIds(teacherId)` or `assertTeacherCanAccessStudent(req.user, student)`) to avoid duplication.

### 4) Routes to leave unchanged (by default)

- Create/update/delete/import students should remain **`school_admin` / `school_staff`** + module only—teachers should not gain write/import unless product explicitly requests it.

## Acceptance Criteria

1. **`GET /api/students/students`** as **`teacher`** with valid JWT → **200** and payload consistent with existing teacher filtering (majors from assigned schedules).
2. **`school_staff`** without `students` module → still **403** with missing-module message from `requireModuleAccessForSchoolStaff`.
3. **`school_admin`** unchanged.

## Implementation Touchpoints

- `backend/routes/students.js` — import + swap middleware on `GET /students`; optionally `GET /students/:id` + Swagger.
- `backend/controllers/students.js` — optional `getStudentById` teacher guard + shared helper if step 3 is in scope.

## Testing Checklist

1. Teacher with schedules → list returns only students in relevant majors.
2. Teacher with no schedules → list returns empty array, **200**.
3. Staff without `students` module → **403** on list.
4. If detail route extended: teacher requests another school’s student id → **403** or **404**; student outside allowed majors → **403**.
