# Backend Plan: Guarded Deactivate + Conditional Delete for School Staff

## Goal

Enforce backend policy so staff lifecycle actions depend on password setup status:

1. `Deactivate/Activate` only allowed when `passwordSetup === true`.
2. `Delete` allowed for pending-setup staff (`passwordSetup === false`) per school scope and role permissions.

This ensures frontend action gating is backed by server-side enforcement.

## Policy Rules

## 1) Status toggle policy

For `PUT /api/staff/:id/status`:

- If target staff has `passwordSetup === false`, reject status change.
- Return `400` with clear message:
  - `Cannot deactivate or activate staff before password setup is completed`

## 2) Delete policy

New endpoint:

- `DELETE /api/staff/:id`

Allowed when:

- Actor is `super_admin` or school-scoped `school_admin`
- Target staff is within scope
- Target staff has `passwordSetup === false`

Blocked when:

- `passwordSetup === true`
- Return `400`:
  - `Cannot delete staff after password setup is completed; use deactivate`

## Scope and Authorization

- Keep existing scope checks (`canAccessStaff`) for all operations.
- Reuse existing role guards:
  - `authorizeRoles('super_admin', 'school_admin')`

## API Changes

## 1) Update existing status endpoint behavior

Endpoint:

- `PUT /api/staff/:id/status`

Behavior change:

- Add policy guard before writing `isActive`.
- Keep existing payload contract (`isActive: boolean`) unchanged.

## 2) Add delete endpoint

Endpoint:

- `DELETE /api/staff/:id`

Response:

- `200` success: `{ message: 'Staff deleted successfully' }`
- `400` policy block
- `403` out-of-scope access
- `404` not found

## Controller Updates

In `backend/controllers/staff.js`:

1. Update `updateStaffStatus`:
   - guard by `staff.passwordSetup`
2. Add `deleteStaff`:
   - fetch by id
   - validate scope
   - enforce pending-setup delete-only rule
   - remove staff record
   - return success response

## Route Updates

In `backend/routes/staff.js`:

- Add:
  - `router.delete('/:id', authorizeRoles(...), validators, validateRequest, staffController.deleteStaff)`

Reuse:

- `param('id').isMongoId()`

## Data/Model Impact

No new model fields required.

Relies on existing:

- `SchoolStaff.passwordSetup`
- `SchoolStaff.isActive`

## Security and Audit

- Log actor id + target id + action type (`status_change_blocked`, `staff_deleted`) in server logs.
- Do not expose sensitive fields in delete/status responses.

## Backward Compatibility

- Existing clients calling status endpoint for pending-setup staff will now receive `400`.
- Frontend should be updated simultaneously to hide invalid actions.

## Testing Plan

Add/extend backend tests for:

1. `PUT /api/staff/:id/status` returns `400` when `passwordSetup=false`
2. `PUT /api/staff/:id/status` succeeds when `passwordSetup=true`
3. `DELETE /api/staff/:id` succeeds when `passwordSetup=false`
4. `DELETE /api/staff/:id` returns `400` when `passwordSetup=true`
5. Scope/role checks (`403`) remain intact

## Delivery Phases

### Phase 1 (must-have)

- Status guard by `passwordSetup`
- New delete endpoint with policy enforcement
- Route + validation wiring

### Phase 2 (should-have)

- Structured audit logging for blocked/allowed lifecycle actions

## Acceptance Criteria

1. Backend blocks deactivation/activation for pending-setup staff.
2. Backend allows deletion only for pending-setup staff within authorized scope.
3. Backend blocks deletion for completed-setup staff with clear guidance to use deactivate.
4. API responses remain consistent and frontend-consumable.
