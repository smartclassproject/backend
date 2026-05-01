# Backend Plan: School Staff Management + Module-Based Access

## Goal

Implement backend support for school operational staff management with strict module-based authorization:

- School admin can create/manage staff only inside own school.
- Super admin can create/manage staff for any school.
- Super admin manages the module catalog.
- Staff access is controlled by `modules[]` and enforced server-side.

This plan mirrors `web/docs/plan/2026-05-01-school-staff-management-plan.md`.

## Scope

### In scope

- Staff CRUD APIs with school scoping.
- Module catalog APIs (super admin only).
- Role template APIs with default modules.
- Route-level module authorization middleware.
- Audit logging for critical actions and denied access.

### Out of scope (phase 1)

- Payroll/HR workflows
- Fine-grained action-level permission matrix
- Multi-campus inheritance rules

## Data Model Plan

### 1) `SchoolStaff`

- `id`
- `schoolId`
- `firstName`
- `lastName`
- `phoneNumber`
- `email` (optional)
- `staffRole` (`MATRON` | `PATRON` | `ACCOUNTANT` | `DIRECTOR_OF_STUDIES` | `OTHER`)
- `customRoleTitle` (required when role is `OTHER`)
- `modules[]` (selected module keys)
- `employmentStatus` (`ACTIVE` | `INACTIVE`)
- `createdByUserId`
- `createdByRole` (`SUPER_ADMIN` | `SCHOOL_ADMIN`)
- `updatedByUserId`
- timestamps

### 2) `StaffModuleCatalog`

- `id`
- `key` (unique normalized key, e.g. `students`)
- `label` (human-readable)
- `description` (optional)
- `isActive`
- `isSystem` (optional, protected from deletion)
- `createdBy`
- `updatedBy`
- timestamps

### 3) `StaffRoleTemplate` (recommended)

- `roleKey` (`DIRECTOR_OF_STUDIES`, `ACCOUNTANT`, etc.)
- `defaultModules[]` (must exist in active module catalog or be grandfathered system keys)
- `isEditable` (optional policy flag)

## API Plan

### A) Staff management

- `POST /api/staff`
- `GET /api/staff`
- `GET /api/staff/:id`
- `PUT /api/staff/:id`
- `PUT /api/staff/:id/status`
- `POST /api/staff/:id/reset-credentials`

#### Staff API rules

- School admin:
  - `schoolId` is resolved from auth context and cannot target other schools.
- Super admin:
  - can target any school.
- `modules[]` must be validated against module catalog.
- If `modules[]` omitted, backend may apply role template defaults.

### B) Role templates

- `GET /api/staff/roles/templates`
- (Optional admin endpoints for later): create/update role templates

#### Role defaults example

- `DIRECTOR_OF_STUDIES` -> `students`, `teachers`, `courses`
- `ACCOUNTANT` -> `finance`, `reports`

### C) Module catalog (super admin only)

- `GET /api/staff/modules`
- `POST /api/staff/modules`
- `PUT /api/staff/modules/:id`
- `PUT /api/staff/modules/:id/status` (activate/deactivate)

#### Catalog rules

- only super admin can create/update/activate/deactivate modules.
- module key must be unique.
- deactivated modules cannot be newly assigned.
- existing assignments with deactivated modules remain readable for history/audit.

## Authorization Enforcement Plan

### 1) Session claims

- Include `modules[]`, `role`, `schoolId`, and actor type in session/JWT claims, or resolve from DB via auth middleware.

### 2) Reusable module guard

- Implement `requireModuleAccess(moduleKey)` middleware.
- Return `403` with standardized payload on failure.

### 3) Apply to route groups

- `/students/*` -> `students`
- `/teachers/*` -> `teachers`
- `/courses/*` -> `courses`
- `/finance/*` -> `finance`
- `/announcements/*` -> `announcements`
- `/inquiries/*` -> `inquiries`
- `/reports/*` -> `reports`
- `/library/*` -> `library`

### 4) Defense in depth

- Keep server-side checks mandatory even when frontend hides menu items.
- Block direct URL/API access if module permission is missing.

## Validation and Error Handling

- Reject unknown module keys in `modules[]`.
- Reject inactive module keys for new assignments.
- Enforce `customRoleTitle` requirement for `OTHER`.
- Return consistent response shape:
  - `success`
  - `message`
  - `data`
  - `errors` (validation details)

## Audit and Security

- Log staff create/update/deactivate/reset actions with actor and school context.
- Log module catalog create/update/status changes.
- Log denied module access attempts (`actorId`, `moduleKey`, `path`, timestamp).
- Rate limit credential reset endpoint.

## Delivery Phases

### Phase 1 (must-have)

- `SchoolStaff` model + scoped CRUD APIs
- `StaffModuleCatalog` read endpoint
- module validation for `modules[]`
- module guard middleware on protected routes

### Phase 2 (should-have)

- super-admin module catalog management endpoints (create/update/status)
- role template defaults endpoint hardening
- improved audit reporting

### Phase 3 (nice-to-have)

- template management UI/backend APIs
- action-level permission overlays per module
- delegated module administration policies

## Acceptance Criteria

1. Super admin can create and manage staff for any school.
2. School admin cannot create/manage staff outside own school.
3. Staff permissions come from catalog-backed `modules[]` only.
4. Super admin can add and manage modules in catalog.
5. Staff with limited modules cannot access unauthorized backend route groups.
6. Unauthorized module access returns `403` and is audit logged.
