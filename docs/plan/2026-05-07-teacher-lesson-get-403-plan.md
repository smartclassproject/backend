# Plan: Teacher `GET /api/lessons/:id` returns 403

## Problem

Teachers hitting `GET /api/lessons/:id` (e.g. from the web app on Vercel) receive `403` with `{ "message": "Access denied" }` even when they own the lesson.

## Root causes (confirmed in code)

1. **`authenticateToken` overwrites `req.user.teacherId`**  
   After resolving the active `Teacher` from the database, the middleware runs `if (decoded.teacherId) user.teacherId = decoded.teacherId`.  
   JWT payloads can be **stale** (issued before a profile fix, or wrong field copied at login). The **canonical** link is `TeacherUser.teacherId` in MongoDB; overwriting it makes ownership checks compare against the wrong id.

2. **`Teacher.findById` preferred `decoded.teacherId` over `user.teacherId`**  
   Line used `decoded.teacherId || user.teacherId`, which prefers the token over the account record. Order should prefer the **database** reference.

3. **Populated `lesson.teacherId`**  
   `getLessonById` uses `.populate('teacherId')`. Comparing `lesson.teacherId.toString()` to the request user id can be brittle; comparisons should normalize to the underlying `_id` string whether the ref is populated or not.

## Mitigation

1. **Auth middleware (`middlewares/auth.js`)**  
   - Resolve teacher with `Teacher.findById(user.teacherId || decoded.teacherId)`.  
   - Do **not** replace `user.teacherId` with `decoded.teacherId` when the token is for a teacher (use the resolved `Teacher._id` only).

2. **Lessons controller (`controllers/lessons.js`)**  
   - Add a small `refIdString()` helper (or shared util) for consistent id comparison.  
   - For teacher-only operations, use **`req.user.teacherId` only** (do not fall back to `req.user._id`, which is the `TeacherUser` id and does not match `Lesson.teacherId`).  
   - Apply the same comparison in `getLessonById`, `updateLesson`, `deleteLesson`, and `getAllLessons` / `createLesson` for teachers.

3. **Verify**  
   - Teacher login → `GET /api/lessons/:id` for an owned lesson returns `200`.  
   - Another teacher’s lesson still returns `403`.

## Out of scope

- Broader refactor of `req.user.teacherId || req.user._id` in other controllers (schedules, exams, etc.) — same pattern may exist; can be a follow-up.
