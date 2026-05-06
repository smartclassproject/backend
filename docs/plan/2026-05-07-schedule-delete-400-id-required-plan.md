# Plan: `DELETE /api/schedules/:id` returns 400 `_id is required`

## Symptom

Deleting a schedule from the school web app fails with:

```json
{ "success": false, "message": "_id is required" }
```

Request shape: `DELETE /api/schedules/{mongoId}` (correct).

## Root cause

`authorizeResourceAccess` in `middlewares/auth.js` resolves the resource id as:

```js
req.params[resourceIdField] || req.body[resourceIdField]
```

with default `resourceIdField = '_id'`.

Express routes are declared as `/:id`, so the segment is available as **`req.params.id`**, not `req.params._id`. The middleware therefore sees no id and returns **400** with `` `${resourceIdField} is required` `` → `"_id is required"`.

This affects any **`school_admin` / `school_staff`** request that hits this middleware on routes using `:id` (e.g. schedules GET/DELETE, courses GET, attendance routes).

## Mitigation

1. **Fix `authorizeResourceAccess`** to resolve the id in a way that matches common Express patterns:
   - Use `req.params[resourceIdField]` when present (e.g. custom `/:scheduleId`).
   - When looking for Mongo `_id` but the route uses `:id`, fall back to **`req.params.id`**.
   - Keep `req.body[resourceIdField]` for methods that pass id in the body.

2. **Regression check** (manual or quick HTTP checks):
   - `DELETE /api/schedules/:id` as school admin/staff with `courses` module → **200** or expected business error (e.g. attendance conflict), not **400 `_id is required`**.
   - `GET /api/schedules/:id` same roles → **200** when schedule belongs to school.

## Optional follow-up

- Audit other middleware or validators that assume `params._id` instead of `params.id`.
- Add a small unit test or integration test for `authorizeResourceAccess` with `req.params.id`.
