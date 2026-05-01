# Backend Plan: Student Secondary Feature Support

## Goal

Provide backend APIs and data contracts needed by mobile upgrades for:
- Fees payment instructions + proof submission clarity
- Study materials readability metadata
- Structured student profile details
- Help inquiries (student <-> school admin)
- Super-admin-managed privacy policy
- Student password change flow
- School staff management (school admin + super admin creation rights)

## Current Gaps To Address

- Fees endpoint returns account data but may not return explicit school payment instructions.
- Materials/lessons payloads may miss display metadata (description/date/type/size).
- Student profile endpoint can return unstructured/raw fields.
- Inquiry feature exists but may need thread/status consistency for mobile UX.
- No dedicated privacy policy content endpoint for student app.
- Password change endpoint for logged-in student may be missing or incomplete.
- No explicit scoped API for operational school staff accounts.

## API Work Plan

### 1) Fees: Payment Instructions + Status

#### Endpoints
- `GET /api/student-app/fees`
  - Ensure response includes:
    - `account` (due/paid/balance/status)
    - `paymentInstructions` (school-level instructions)
- `POST /api/student-app/fees/submissions`
  - Keep submission flow, enforce validation and status transitions.

#### Response contract (target)
- `account`:
  - `totalAmountDue`, `totalAmountPaid`, `balance`, `status`
- `paymentInstructions`:
  - `paymentMethods[]`
  - `accountName`
  - `accountNumber` / `walletNumber`
  - `bankName`, `branch` (optional)
  - `notes`
  - `updatedAt`

### 2) Study Materials + Lessons Metadata

#### Endpoints
- `GET /api/student-app/materials`
- `GET /api/student-app/lessons`

#### Improvements
- Add/normalize fields for better UI rendering:
  - `title`
  - `description`/`summary`
  - `courseName`/`subject`
  - `fileType`
  - `fileSize` (if available)
  - `publishedAt`
  - `downloadUrl` / `resourceUrl`

### 3) Student Profile Details

#### Endpoint
- `GET /api/student-app/me`

#### Improvements
- Return structured payload grouped logically:
  - identity
  - personal details
  - academic details
  - parent/guardian details
- Ensure fields needed by app are present:
  - dateOfBirth, major/class names, parent names/phone, enrollment/term fields

### 4) Help / Inquiry Threading

#### Endpoints (verify/extend)
- `GET /api/student-app/inquiries`
- `POST /api/student-app/inquiries`
- `POST /api/student-app/inquiries/:id/reply`

#### Improvements
- Add explicit statuses (`open`, `answered`, `closed`).
- Return thread-friendly messages with timestamps and sender role.
- Enforce authorization: student sees only own inquiries.

### 5) Privacy Policy (Super Admin Managed)

#### New entities/endpoints
- Storage model: privacy policy document (global or per-school)
- `GET /api/student-app/privacy-policy`
  - Returns active policy for student context (school/global fallback)
- Admin management endpoints:
  - `POST/PUT /api/admin/.../privacy-policy`
  - publish/unpublish/version fields

#### Fallback behavior
- If no policy configured, API returns empty payload + message so app shows fallback text.

### 6) Change Password for Student

#### Endpoint
- `POST /api/student-app/change-password`

#### Request payload
- `currentPassword`
- `newPassword`
- `confirmPassword` (optional on API side; app validates but backend may also verify match if sent)

#### Validation/security
- Current password verification
- Password policy checks (length/complexity as project standard)
- Hash update with bcrypt
- Optional: invalidate old sessions/tokens
- Rate limit + audit logging for password changes

### 7) School Staff Management

#### Endpoints (new)

- `POST /api/staff`
- `GET /api/staff`
- `GET /api/staff/:id`
- `PUT /api/staff/:id`
- `PUT /api/staff/:id/status`
- `POST /api/staff/:id/reset-credentials`
- `GET /api/staff/roles/templates`
- `GET /api/staff/modules`
- `POST /api/staff/modules` (super admin only)
- `PUT /api/staff/modules/:id` (super admin only)
- `PUT /api/staff/modules/:id/status` (super admin only)

#### Scope and authorization rules

- Super admin can create/manage staff for any school.
- School admin can create/manage staff for own school only.
- School admin requests must enforce `actor.schoolId === target.schoolId`.
- Cross-school queries or writes by school admin must return `403`.
- Module catalog create/update/status endpoints are super-admin only.

#### Request/response contract (target)

- Required on create:
  - `schoolId` (optional for school admin, resolved from token)
  - `firstName`, `lastName`, `phoneNumber`, `staffRole`
  - `modules[]` (selected module permissions; can default from role template)
- Optional:
  - `email`
  - `customRoleTitle` (required when `staffRole=OTHER`)
- Response includes:
  - `id`, `schoolId`, `staffRole`, `modules[]`, `employmentStatus`
  - `createdByUserId`, `createdByRole`
  - timestamps

#### Module permission rules

- Do not accept arbitrary typed permission strings.
- Validate `modules[]` against backend module catalog endpoint (`GET /api/staff/modules`).
- Role template endpoint returns recommended defaults, for example:
  - `DIRECTOR_OF_STUDIES` -> `students`, `teachers`, `courses`
- Allow admins to adjust selected modules only within allowed policy boundaries.
- Module catalog rules:
  - only active modules are assignable
  - module key must be unique and normalized (e.g., lowercase snake/camel policy)
  - deactivated modules cannot be newly assigned

#### Implementation plan: backend authorization by module

1. Include `modules[]` in authenticated session/JWT claims (or resolve from DB on each request).
2. Add reusable middleware: `requireModuleAccess(moduleKey)`.
3. Attach middleware to protected route groups:
   - `/students/*` -> requires `students`
   - `/teachers/*` -> requires `teachers`
   - `/courses/*` -> requires `courses`
   - `/finance/*` -> requires `finance`
   - etc.
4. Return `403` with consistent payload when module access is missing.
5. Keep backend as source of truth even if frontend hides menus.
6. Audit denied access attempts (actor, moduleKey, path, timestamp).

## Data Model Changes

### Potential models to add/update
- `SchoolPaymentInstruction` (if not already complete in student response path)
- `PrivacyPolicy` (new)
- `Inquiry` (status/thread metadata consistency)
- `StudentUser` auth methods (password change path)
- `SchoolStaff` (new, operational staff identity + role + `modules[]` + status)
- `StaffRoleTemplate` (optional, role-to-default-modules mapping)
- `StaffModuleCatalog` (enumerates valid selectable modules)

## Middleware and Validation

- Add request validators for:
  - fee proof submission payload
  - inquiry creation/reply payload
  - change-password payload
  - privacy policy admin payload
  - staff create/update payloads
- Standardize response format to current API convention:
  - `success`, `message`, `data`, and consistent validation errors array.

## Security + Authorization

- Student endpoints must scope by authenticated student and school.
- Privacy policy admin endpoints restricted to super admin (and optionally school admin with policy scope rules).
- Staff endpoints must enforce school-level boundaries for school admins.
- Keep CORS/helmet/static policies compatible with mobile and web clients.

## Delivery Phases

### Phase 1 - Fees + Profile response hardening
- Ensure student-app fees and profile responses include all required fields.

### Phase 2 - Materials/Lessons metadata normalization
- Add missing metadata fields and mapping.

### Phase 3 - Inquiry thread/status improvements
- Implement status and thread-friendly response shape.

### Phase 4 - Privacy policy APIs
- Add model, admin management endpoint(s), and student read endpoint.

### Phase 5 - Change password API
- Implement secure password change endpoint and validations.

### Phase 6 - School staff APIs
- Add `SchoolStaff` model + scoped CRUD endpoints.
- Enforce super-admin/global and school-admin/local permissions.
- Enforce module-catalog validation for `modules[]` and expose module catalog endpoint.
- Add super-admin module catalog management endpoints (create/update/activate/deactivate).
- Add module access middleware and apply to protected route groups.

### Phase 7 - QA + docs
- Update API reference docs and verify mobile integration with realistic test payloads.

## Acceptance Criteria

- Fees endpoint returns both account status and school payment instructions for students.
- Materials/lessons endpoints provide enough metadata for clean card-based mobile UI.
- Student profile endpoint returns complete structured details (DOB, major, parent, etc.).
- Inquiry endpoints support create/list/reply with status tracking.
- Privacy policy is manageable by super admin and readable from student app with empty fallback support.
- Change password endpoint is secure, validated, and production-ready.
- Staff endpoints allow school admin and super admin creation flows with correct school scoping.
- Staff module permissions are selected from module catalog (not typed manually) and validated server-side.
- Super admin can add/manage module catalog items through protected endpoints.
- Requests to unauthorized modules are blocked server-side with `403` even if user tries direct URL/API access.
