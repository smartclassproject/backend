# Backend Plan: Created-By Audit Trail + Module-Aware Dashboard Data

## Goal

Implement backend support for:

1. `createdBy` tracking on core registration entities (teachers, students, announcements, and other person-registration flows).
2. A single dashboard data API that returns cards and graph datasets filtered by role + module permissions.
3. Super admin visibility into creator metadata for audit and reporting.

## Scope

### In scope

- Add creator audit fields on key schemas where users/entities are created.
- Backfill-safe API contracts for list/detail responses with creator info.
- New common dashboard summary endpoints with module-scoped sections.
- Super admin analytics/audit breakdown by creator type.
- Profile/account API support parity for school staff (same style used by teacher/admin account flows).

### Out of scope (phase 1)

- Historical migration script for all legacy documents (optional phase 2/3).
- Real-time streaming dashboards.
- BI warehouse export.

## Data Model Strategy

Use a consistent creator metadata shape across schemas:

- `createdByUserId` (ObjectId, nullable)
- `createdByRole` (enum/string, nullable)
- `createdByModel` (string, nullable)  
  Examples: `AdminUser`, `SchoolStaff`, `TeacherUser`, `System`

Optional complementary field:

- `createdByDisplayName` (denormalized string, optional for list performance)

## Schemas to Update (Phase 1)

Primary requested:

- `Teacher` (or `TeacherUser` depending on where registration is finalized)
- `Student` / `StudentUser`
- `Announcement`

Other person-registration schemas to include now:

- `ParentUser` (if created by admin/staff flow)
- `SchoolStaff` (already has partial creator fields; align naming if needed)
- Any admission/registration entity that creates a person account/profile

## Write Path Changes

In create controllers/services:

- Resolve actor from `req.user` (`userId`, `role`, model source).
- Persist creator fields at creation time.
- Keep role normalization (`super_admin`, `school_admin`, `school_staff`, etc.) consistent.

System-created records:

- Set `createdByModel = 'System'` and nullable `createdByUserId`.

## Read Path Changes

List/detail endpoints should expose creator info where appropriate:

- School admin/staff: minimal creator metadata.
- Super admin: full creator metadata + filters.

Recommended response shape:

- `createdBy: { userId, role, model, name? }`

## Common Dashboard API Plan

## 1) Unified school dashboard endpoint

Example:

- `GET /api/dashboard/summary`

Return sections keyed by module:

- `students`: total, trend
- `teachers`: total, trend
- `courses`: total, trend
- `announcements`: total, trend
- `inquiries`, `finance`, `reports`, etc.

Rules:

- For `school_staff`, include only modules in `req.user.modules`.
- For `school_admin` and `super_admin`, include all permitted sections.

## 2) Graph datasets endpoint

Example:

- `GET /api/dashboard/graphs`

Return graph payloads by module key:

- enrollment trend (students)
- teacher growth (teachers)
- course creation trend (courses)
- announcements/inquiries activity
- finance trend (if finance module)

Enforce same module filtering on backend (not only frontend).

## 3) Super admin creator analytics endpoint

Example:

- `GET /api/admin/dashboard/creator-analytics`

Include:

- counts by `createdByRole`
- counts by creator account
- recent records with creator metadata

## Authorization Rules

- `school_staff`: module-limited view (`requireModuleAccess` aligned for dashboard sub-sections).
- `school_admin`: school-scoped full dashboard.
- `super_admin`: cross-school and creator analytics access.
- `school_staff` profile endpoints: can read/update own profile and change own password.

## Query/Performance Notes

- Add indexes where needed:
  - `createdByUserId`
  - `createdAt`
  - `schoolId + createdAt`
- Prefer aggregated pipelines with date-bucket caching for graph endpoints.
- Consider 5-15 minute cache layer for heavy super admin aggregations.

## Migration / Backfill Plan

Phase 1:

- New writes include creator metadata.
- Legacy records may have null creator fields.

Phase 2:

- Backfill best-effort via audit logs / known ownership relationships.

## Testing Plan

1. Schema write tests: creator fields saved on create.
2. Role tests: school staff sees only module-permitted dashboard sections.
3. Super admin tests: creator analytics includes `createdByRole` breakdown.
4. Regression tests: existing create/list endpoints still work when creator fields are null.

## Delivery Phases

### Phase 1 (must-have)

- Add creator fields to requested schemas.
- Populate on create in controllers.
- Add unified dashboard cards + graphs API with module filtering.

### Phase 2 (should-have)

- Super admin creator analytics endpoint.
- Response enrichment with creator names.

### Phase 3 (nice-to-have)

- Backfill migration + caching optimizations.

## Acceptance Criteria

1. Newly created teacher/student/announcement records persist creator metadata.
2. Other registration schemas follow the same creator pattern.
3. Dashboard cards/graphs are returned only for modules user can access.
4. Super admin can view creator-focused analytics and source attribution.
5. Backend enforces all module and scope checks regardless of frontend behavior.
