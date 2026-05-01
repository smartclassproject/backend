# Backend Plan: Reusable Media Upload API (Images, Videos, Docs)

## Goal

Create one reusable upload system for:
- Images (required for school fee proof)
- Videos
- Documents (PDF, PPT, PPTX, DOC, DOCX, etc.)

This upload system should be reusable across modules:
- Student fee proof
- Teacher materials/content
- Announcements/news attachments
- Future features needing file attachments

## Current Problem

- File uploads are handled inconsistently across features.
- No single API contract for upload + metadata + ownership.
- School fee proof should enforce image-only files, but current flow is too flexible.

## Architecture Decision

Use a **central FileAsset model + Upload API** and let feature modules reference uploaded asset IDs.

### Core principles
- One upload API for all file types.
- Context-based validation (e.g., `fees_proof` allows only images).
- Store file metadata for reuse and audit.
- Keep access control role-aware (student, teacher, school admin, super admin).

## Data Model Plan

### New model: `FileAsset`
- `_id`
- `schoolId`
- `uploadedById`
- `uploadedByModel` (`StudentUser`, `TeacherUser`, `AdminUser`)
- `context` (e.g., `fees_proof`, `study_material`, `announcement_attachment`)
- `storagePath`
- `publicUrl`
- `mimeType`
- `category` (`image`, `video`, `document`, `other`)
- `originalName`
- `extension`
- `sizeBytes`
- `checksum` (optional dedupe/audit)
- `isActive`
- `createdAt`, `updatedAt`

## API Design

### 1) Generic upload endpoint
- `POST /api/uploads`
- multipart/form-data:
  - `file`
  - `context`
  - `visibility` (optional)
  - `tags` (optional)

#### Behavior
- Validates MIME type and size using context policy.
- Stores file physically (`/uploads/...`) and saves `FileAsset`.
- Returns canonical metadata:
  - `assetId`
  - `url`
  - `mimeType`
  - `category`
  - `sizeBytes`
  - `context`

### 2) Optional helpers
- `GET /api/uploads/:id` (metadata)
- `DELETE /api/uploads/:id` (soft delete + permission checks)

## Context Policy Matrix (initial)

- `fees_proof`:
  - allowed: images only (`image/jpeg`, `image/png`, `image/webp`)
  - max size: e.g. 5MB
- `study_material`:
  - allowed: image, video, document
  - max size: e.g. 100MB
- `announcement_attachment`:
  - allowed: image, document
  - max size: e.g. 20MB

Policies should live in one reusable config module.

## Integration Plan

### A) Fees proof (mandatory image)
- Update fee proof submission endpoint to accept either:
  - `proofAssetId` (preferred), or
  - legacy `proofUrl` for backward compatibility.
- Validate that selected `proofAssetId`:
  - exists
  - belongs to same school/user scope
  - `context === fees_proof`
  - `category === image`

### B) Teacher uploads
- Teacher content/material creation should reference uploaded `assetId`.
- Keep old URL path temporarily for migration compatibility.

### C) Other modules
- Announcements/news can attach `assetIds` with context policy checks.

## Security & Compliance

- Strict MIME + extension validation.
- File size limits per context.
- Filename sanitization + generated storage names.
- Virus scanning hook point (phase 2 if not immediately available).
- Rate limiting for upload endpoints.
- Audit logs: who uploaded what and for which context.

## Storage & Serving

- Start with local disk (`/uploads`) using current static serving.
- Keep abstraction ready for S3/Cloud storage migration.
- Ensure CORS/CORP headers allow client usage.

## Migration / Backward Compatibility

- Keep existing URL-based fields operational while introducing `assetId`.
- Read path:
  - if `proofAssetId` exists, resolve via FileAsset
  - else fallback to legacy URL
- Provide migration script later for old records.

## Delivery Phases

### Phase 1 - Core upload infrastructure
- Add `FileAsset` model.
- Add upload service + policy config + `POST /api/uploads`.

### Phase 2 - Fee proof integration
- Enforce image-only proof via `fees_proof` context.
- Update fee proof validators/controller.

### Phase 3 - Teacher/study materials integration
- Add `assetId` support in material flows.

### Phase 4 - Docs + cleanup
- Document API contract.
- Add delete/metadata endpoints and tests.

## Acceptance Criteria

- A single reusable upload API supports image/video/document uploads.
- Fee proof flow enforces **image-only** uploads.
- Upload assets are reusable across fees, teacher materials, and future modules.
- API returns consistent metadata (`assetId`, url, type, size, context).
- Security checks (type/size/ownership) are enforced for every upload context.
