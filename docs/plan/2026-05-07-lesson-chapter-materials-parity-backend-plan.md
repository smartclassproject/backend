# Backend Plan: Lesson / Chapter Embedded Materials Parity with Study Materials

## Goal

Support chapter (lesson) attachments the same way study materials do: **broad file types**, **upload URLs under `/uploads/...`**, and optional **file metadata**, without breaking existing lessons that only store `{ name, url, type }`.

## Current Behavior

### Model (`backend/models/Lesson.js`)

- Embedded `materialSchema`: `name`, `url` (required), `type` enum **`['pdf', 'video', 'link', 'document']`** only.
- No `fileName` / `fileSize` fields.

### Routes (`backend/routes/lessons.js`)

- `body('materials.*.url').optional().isURL()` — **rejects** relative upload paths such as `/uploads/study_material/asset-....pdf` returned by `POST /api/uploads/:context`.
- `materials.*.type` limited to the same four values.

### Uploads (`backend/middlewares/uploadAsset.js`)

- Teachers already use context **`study_material`** from the web app for study materials. Chapter attachments can **reuse** this context (same policy and storage layout) unless product requires a separate folder; if separated later, add e.g. `lesson_attachment` mirroring `study_material` limits.

## Problems

1. Uploaded chapter files cannot pass validation because **`isURL()`** does not allow `/uploads/...`.
2. **`type`** enum is narrower than study materials (`backend/routes/materials.js` allows `pdf`, `ppt`, `pptx`, `video`, `image`, `document`, `other`, `link`).
3. Optional metadata (`fileName`, `fileSize`) useful for teacher UI parity is not stored.

## Proposed Backend Changes

### 1) Embedded schema (`Lesson.js`)

- Extend `type` enum to match materials route:
  - `['pdf', 'ppt', 'pptx', 'video', 'image', 'document', 'other', 'link']`
- Add optional fields on subdocuments:
  - `fileName`: String, max length (e.g. 255), trim
  - `fileSize`: Number, non-negative (optional)
- Keep **`url`** as the canonical storage for the resource location (http(s) or `/uploads/...`).
- Update Swagger comment block on the Lesson schema to reflect new fields/enums.

### 2) Validation (`backend/routes/lessons.js`)

- Reuse the same URL rules as materials (see `backend/routes/materials.js`):
  - `isAbsoluteHttpUrl` + `isUploadsPath` + `isAllowedMaterialUrl(value, type)` where `type === 'link'` requires http(s), otherwise allow http(s) **or** `/uploads/...`.
- Apply **custom** validator on `materials.*.url` instead of `.isURL()`.
- Expand `materials.*.type` `.isIn([...])` to the full list above.
- Optional: `materials.*.fileName`, `materials.*.fileSize` with same bounds as materials route.

### 3) Controller (`backend/controllers/lessons.js`)

- No structural change required if `materials` is passed through as today; ensure **create/update** do not strip unknown keys if Mongoose schema is updated (embedded schema defines allowed keys).
- Spot-check: teacher vs admin permission paths unchanged.

### 4) Student / API consumers

- Any consumer that displays `lesson.materials` should treat new fields as optional; **existing** documents remain valid.

## Testing Checklist

1. `POST /api/lessons` with `materials: [{ name: "Slide deck", url: "/uploads/study_material/asset-x.pdf", type: "pdf", fileName: "deck.pdf", fileSize: 12345 }]` → **201**, persisted.
2. Same with `type: "link"` and `url: "https://example.com"` → **201**.
3. Invalid: `type: "link"` and `url: "/uploads/foo"` → **400**.
4. Legacy payload with only four enum values → still accepted.

## Rollout

1. Deploy backend (schema + validation) before or together with web changes that upload files for chapters.
2. No mandatory data migration; old records keep working.
