# Backend Plan: Staff Password Flow Alignment (Match Teacher Flow)

## Goal

Support a teacher-like credentials lifecycle for `SchoolStaff` users:

1. send initial credentials email on staff creation,
2. allow resend credentials email,
3. expose password setup status/metadata for web UI enhancements.

This plan aligns with:

- `web/docs/plan/2026-05-01-staff-password-flow-alignment-plan.md`

## Scope

### In scope

- Staff create endpoint updates for credentials email feedback.
- Staff resend credentials endpoint.
- Staff list payload extensions (`passwordSetup`, `lastCredentialsSentAt`).
- Audit metadata for credentials operations.

### Out of scope (phase 1)

- Full background job queue for emails.
- SMS credentials delivery.
- Bulk resend endpoint.

## Data Model Updates

## `SchoolStaff` additions

- `passwordSetup` (boolean, default `false`)
- `lastCredentialsSentAt` (Date, nullable)
- `credentialsSendCount` (Number, optional)

Notes:

- `passwordSetup` becomes `true` when staff completes first-password flow.
- `lastCredentialsSentAt` updates on create-email and resend-email attempts that succeed.

## API Changes

### 1) Create staff

Endpoint:

- `POST /api/staff`

Changes:

- Continue creating staff record.
- Trigger credentials email send (email + temporary password) similar to teacher flow.
- Response data should include:
  - `passwordSetup`
  - `credentialsEmailSent` (boolean)
  - optional `message` clarifying partial success when email fails

Failure policy:

- If staff creation succeeds but email fails:
  - return success with warning-style message OR explicit partial-success field
  - do not rollback staff record

### 2) Resend credentials

New endpoint:

- `POST /api/staff/:id/resend-credentials`

Authorization:

- `super_admin` and school-scoped `school_admin`.

Behavior:

- Validate target staff exists and is in scope.
- Re-send credentials/setup email (same template family as teacher credentials flow).
- Update `lastCredentialsSentAt` and audit fields on success.

Response:

- `200` on success
- `400` if resend disallowed by policy
- `403/404` as appropriate for auth/not found

### 3) Staff list/read payloads

Endpoints:

- `GET /api/staff`
- `GET /api/staff/:id`

Add fields:

- `passwordSetup`
- `lastCredentialsSentAt`

These are required by web Optional UI enhancements (status badge/filter).

## Email Service Integration

Reuse existing credentials mail style:

- similar content style as teacher credentials (`sendTeacherCredentialsEmail` equivalent for staff)
- include:
  - login email
  - temporary/default password
  - link to login
  - reminder to change password on first login

Recommended utility:

- `sendStaffCredentialsEmail(to, email, defaultPassword, staffName, school?)`

## Security and Policy Rules

- Never expose permanent passwords in read/list endpoints.
- Temporary password should only be returned at creation-time if policy allows.
- Rate-limit resend endpoint to prevent abuse.
- Log actor + target + timestamp for create/resend/reset actions.

## Optional UI Enhancements Backend Support

To support web status badge/filter:

- Ensure `passwordSetup` is always present on staff payloads.
- Ensure `lastCredentialsSentAt` is present when available.
- Keep values consistent after:
  - create staff
  - resend credentials
  - password setup completion

## Delivery Phases

### Phase 1 (must-have)

- Add `passwordSetup` + `lastCredentialsSentAt` fields.
- Update `POST /api/staff` to trigger credentials email and return send outcome.
- Implement `POST /api/staff/:id/resend-credentials`.
- Include new fields in list/detail responses.

### Phase 2 (should-have)

- Add resend throttling and clearer partial-success response contract.
- Add credentials delivery audit counters/metadata.

### Phase 3 (nice-to-have)

- Queue-based email delivery with retries and status tracking.
- Bulk resend endpoint for `Pending setup` staff.

## Acceptance Criteria

1. Staff creation sends credentials email using teacher-equivalent flow.
2. Admin can resend staff credentials via dedicated endpoint.
3. Staff payload includes `passwordSetup` and `lastCredentialsSentAt`.
4. Web can render pending/completed badge and filter reliably from backend fields.
5. Email failures do not silently block staff creation; response clearly indicates outcome.
