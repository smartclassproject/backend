# Backend Plan: Student Bulk Import via CSV Template + Upload

## Goal

Allow school users to:

1. Download a standard student CSV template.
2. Fill rows offline.
3. Upload CSV and create students in bulk with validation feedback.

## Input Sample Observations

From `docs/students_table_extracted.csv`, common columns are:

- `Names`
- `Gender`
- `Class`
- `Father`
- `Mother`
- `Phone`
- `Birthday`

Data quality issues already visible:

- Empty rows.
- Missing required fields in some rows.
- Date format `DD/MM/YYYY`.
- Mixed phone lengths and inconsistent values.

## Scope

### In scope

- Template generation endpoint.
- CSV upload endpoint (multipart).
- Parsing, normalization, per-row validation.
- Bulk create with row-level result report.
- Role/module enforcement and school scoping.

### Out of scope (phase 1)

- XLS/XLSX support.
- Async background job queue (can be phase 2).
- Automatic duplicate merge resolution UI.

## API Design

## 1) Download template

- `GET /api/students/import/template`

Returns CSV with header row and sample row.

Template columns (canonical backend contract):

- `name` (required)
- `gender` (required: `male|female|other|prefer_not_to_say`)
- `classCode` (required, maps to class)
- `majorCode` (optional if default major mapping strategy is enabled; otherwise required)
- `dateOfBirth` (required; accepts `YYYY-MM-DD` and `DD/MM/YYYY`)
- `email` (optional)
- `phone` (optional)
- `parentFirstName` (optional)
- `parentLastName` (optional)
- `parentPhoneNumber` (optional)
- `entryTerm` (optional, default 1)
- `academicYear` (optional, default current year)
- `enrollmentSeason` (optional, default school default season)

Notes:

- Keep exported template fields aligned with create-student backend rules.
- Include comments in docs (not in CSV body) for accepted values/formats.

## 2) Upload and validate/import

- `POST /api/students/import/csv`
- Content-Type: `multipart/form-data` with file field `file`

Response shape:

- `summary`:
  - `totalRows`
  - `validRows`
  - `createdCount`
  - `failedCount`
- `results[]` per row:
  - `rowNumber`
  - `status` (`created|failed|skipped`)
  - `studentId?`
  - `errors[]`

## Authorization

- Allowed roles: `school_admin`, `school_staff`
- Enforce `requireModuleAccess('students')`
- All class/major lookups and student creation are restricted to `req.user.schoolId`

## Parsing and Validation Strategy

## CSV parser

- Use streaming parser (`csv-parse` or `fast-csv`) to handle large files safely.
- Trim headers and values.
- Skip fully empty lines.

## Header mapping

Support aliases for practical uploads:

- `Names` -> `name`
- `Class` -> `classCode`
- `Birthday` -> `dateOfBirth`
- `Father` -> `parentFirstName` (or split strategy disabled in phase 1)
- `Mother` -> `parentLastName` (or dedicated mother fields, ignored in phase 1)

Prefer explicit canonical template going forward; alias support helps migration from existing sheets.

## Row validations

- Required: name, classCode, gender, dateOfBirth.
- Gender normalization:
  - `M/F` -> `male/female`
- Date parsing:
  - `YYYY-MM-DD`
  - `DD/MM/YYYY`
- Class lookup by code/name in current school.
- Major lookup by code/name (if required by policy).
- Email format validation.
- Duplicate checks:
  - duplicate email (if provided)
  - duplicate `cardId` (if later included)

## Creation behavior

- Default missing optional fields.
- Generate student IDs using existing generator.
- Use existing create logic or extracted service to preserve all business rules.
- Continue processing after row failure; do not fail entire file.

## Data Integrity / Transactions

Phase 1 choice:

- Best-effort per-row insert (partial success allowed).

Optional phase 2:

- `dryRun=true` mode.
- `atomic=true` mode with transaction.

## Error Reporting

Return deterministic row-level messages, e.g.:

- `Class code "L3XYZ" not found in your school`
- `Invalid birthday format`
- `Gender must be one of male/female/other/prefer_not_to_say`

## Security and Limits

- Restrict file size (e.g., 5MB).
- Restrict max row count (e.g., 5,000 rows).
- MIME/type + extension checks (`.csv` only).
- Sanitize untrusted CSV cell strings.

## Testing Plan

1. Template download returns expected headers.
2. Happy path import creates students and returns created row report.
3. Mixed file (valid + invalid rows) returns partial success with row errors.
4. Staff with students module can import; staff without students module gets 403.
5. Cross-school class/major references are rejected.
6. Date and gender normalization from real sample formats works.

## Delivery Phases

### Phase 1 (must-have)

- Template endpoint.
- CSV upload endpoint with row-level validation + partial import.

### Phase 2 (should-have)

- `dryRun` validation-only mode.
- Import audit trail with downloadable error CSV.

### Phase 3 (nice-to-have)

- Async job processing for very large imports.
- XLSX support.

## Acceptance Criteria

1. User can download a template CSV from backend-supported contract.
2. Uploading filled CSV creates students in bulk for valid rows.
3. Invalid rows are reported with exact row number and reason.
4. Access is restricted by role, module, and school scope.
5. Existing student creation rules remain consistent with single-create API.
