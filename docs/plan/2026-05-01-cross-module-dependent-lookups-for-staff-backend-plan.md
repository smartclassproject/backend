# Backend Plan: Cross-Module Dependent Lookups for School Staff

## Goal

Allow `school_staff` users (e.g., matron/metron) to complete valid workflows in their assigned module even when the form depends on read-only data owned by another module.

Example:

- Staff with `students` access should still be able to fetch/select `majors` and `classes` required for student registration, even if they do not have full `courses` module access.

## Problem

Current module authorization is strict per route/module key.  
Some create flows require reference data from another module:

- Student creation depends on:
  - majors
  - classes
- Without those lookups, student registration is blocked for staff who should otherwise be allowed to register students.

## Scope

### In scope

- Introduce backend policy for **dependent lookup reads**.
- Keep write/update/delete authorization strict by owning module.
- Add safe read endpoints (or route-level exceptions) that return only minimal lookup fields.
- Apply first to student registration dependencies (`majors`, `classes`).

### Out of scope (phase 1)

- Broad cross-module write privileges.
- Full visibility to all course resources for staff without `courses` module.
- Reworking entire permission model.

## Authorization Strategy

## 1) Add dependency-read policy map

Define centralized mapping:

- `students` module may read:
  - `major` lookup (minimal fields)
  - `class` lookup (minimal fields)

Potential future mappings:

- `finance` may read student lookup
- `reports` may read course/teacher lookup

## 2) Keep strict ownership for mutations

No change for non-lookup operations:

- `POST/PUT/DELETE` in `courses` domain still require `courses` module (or admin roles).

## 3) Read-only minimal data contract

Lookup endpoints should return only what dependent forms need:

- Major: `_id`, `name`, `code`
- Class: `_id`, `name`, `code`

No schedules, analytics, or sensitive/extra fields.

## API Options

Preferred option:

- Add explicit endpoints dedicated to cross-module dependencies:
  - `GET /api/students/dependencies`
    - returns `{ majors: [...], classes: [...] }`
    - authorized for `school_admin` and staff with `students` module

Alternative:

- Add route-level exception on specific lookup routes with custom middleware:
  - `allowDependencyLookup('students', 'courses')`

## Middleware Plan

Add helper middleware (or extend `requireModuleAccess`):

- `requireModuleAccessOrDependency(primaryModule, dependencyResource)`
- Internally checks:
  - direct module access, OR
  - dependency policy grants read-only lookup access

Guardrails:

- only for `GET` lookup endpoints
- only school-scoped resources

## Controller/Data Rules

- Always filter by `req.user.schoolId` for staff and school_admin.
- Validate that selected `majorId` / `classId` still belong to user school at write time.
- Keep create validation unchanged (major/class required as before), but ensure lookup data is accessible.

## Security Notes

- No privilege escalation: dependency access is read-only and minimal.
- No cross-school leakage: enforce school scope on all lookup queries.
- Audit logs (optional): log when dependency lookup policy is used.

## Testing Plan

1. Staff with `students` only:
   - can call student dependencies endpoint
   - receives majors/classes from own school only
2. Same staff:
   - cannot create/update/delete courses/majors/classes
3. Staff without `students`:
   - cannot call students dependencies endpoint
4. School admin:
   - unchanged full school access behavior
5. Regression:
   - existing module checks continue to block non-lookup unauthorized routes

## Delivery Phases

### Phase 1 (must-have)

- Introduce policy + dependency endpoint for student registration.
- Wire majors/classes lookup response.

### Phase 2 (should-have)

- Reuse policy for other dependent flows.
- Add structured audit logging for dependency usage.

## Acceptance Criteria

1. Matron/staff with `students` module can complete student registration form end-to-end.
2. Required majors/classes are available as read-only lookup data without granting full `courses` module.
3. Staff still cannot perform course-module mutations unless explicitly authorized.
4. All dependency lookups remain school-scoped and secure.
