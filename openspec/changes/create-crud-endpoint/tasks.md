## 0. Branch Setup (MANDATORY - must be first)

- [x] 0.1 Create and switch to feature branch `feature/VN-4175-backend`

## 1. Database & Prisma Setup

- [x] 1.1 Add `prisma` and `@prisma/client` to `backend/package.json`
- [x] 1.2 Add `exceljs` (or equivalent streaming-capable Excel library) to `backend/package.json`
- [x] 1.3 Create `backend/prisma/schema.prisma` with `datasource db` using `url = env("DATABASE_URL")` and `directUrl = env("DIRECT_URL")`
- [x] 1.4 Define the `Activity` Prisma model: `id`, `name` (varchar 100, case-insensitive unique index), `active` (boolean, default true), `createdAt`, `updatedAt`, `createdBy`
- [x] 1.5 Add `DATABASE_URL` and `DIRECT_URL` placeholders to `backend/.env.example` (no real credentials)
- [x] 1.6 Add fail-fast startup validation for `DATABASE_URL`/`DIRECT_URL`, mirroring the existing `azureB2CConfig.ts` validation pattern
- [x] 1.7 Generate and review the initial migration (`npx prisma migrate dev --name add_activities_table`)

## 2. Domain Layer

- [x] 2.1 Create `backend/src/domain/models/Activity.ts` (entity: constructor, invariants for `name` length/non-empty)
- [x] 2.2 Create `backend/src/domain/repositories/IActivityRepository.ts` (interface: `findMany` with search/pagination, `findById`, `findByNameCaseInsensitive`, `create`, `update`, `updateStatus`)

## 3. Infrastructure Layer

- [x] 3.1 Create `backend/src/infrastructure/repositories/ActivityRepository.ts` implementing `IActivityRepository` via Prisma (paginated `ILIKE` search, case-insensitive duplicate lookup)

## 4. Application Layer

- [x] 4.1 Add activity validation functions to `backend/src/application/validator.ts` (required `name`, max 100 chars, `active` boolean type check)
- [x] 4.2 Create `backend/src/application/services/activityService.ts`: `list` (search + pagination), `create` (duplicate check → 409), `update` (existence check → 404, duplicate check excluding self → 409), `updateStatus` (existence check → 404), `exportToExcel` (reuses `list`'s filter logic, unpaginated, streaming)

## 5. Presentation Layer

- [x] 5.1 Create `backend/src/presentation/controllers/activityController.ts` with handlers for list, create, update, updateStatus, export, mapping domain errors to HTTP 400/404/409/500 using the standard `{ success, data, message }` / `{ success: false, error: { message, code } }` envelope
- [x] 5.2 Create `backend/src/presentation/routes/activityRoutes.ts` registering `GET /api/activities`, `POST /api/activities`, `PUT /api/activities/:id`, `PATCH /api/activities/:id/status`, `GET /api/activities/export`
- [x] 5.3 Register the activity router in `backend/src/index.ts`

## 6. Review and Update Existing Unit Tests (MANDATORY)

- [x] 6.1 Review existing tests under `backend/src/_test/` for any overlap or shared utilities (e.g. Prisma client mocks) affected by introducing Prisma for the first time
- [x] 6.2 Write unit tests for `Activity` domain model (invariants, boundary lengths)
- [x] 6.3 Write unit tests for `ActivityRepository` (mocked Prisma client): filter construction, pagination, `ILIKE` search, duplicate lookup
- [x] 6.4 Write unit tests for `activityService`: happy paths, duplicate name (create/update), not-found (update/status), pagination edge cases (empty result, last page, limit cap at 10), status toggle, export filter reuse
- [x] 6.5 Write unit tests for `activityController`: request/response handling, validation error formatting, correct HTTP status codes (200/201/400/404/409/500)
- [x] 6.6 Write unit tests for the new environment-variable validation (`DATABASE_URL`/`DIRECT_URL`): missing value, malformed value

## 7. Run Unit Tests and Verify Database State (MANDATORY)

- [x] 7.1 Run `npm test` and `npm run test:coverage` in `backend/`; confirm 90% threshold (branches/functions/lines/statements) is met for all new files
- [x] 7.2 Apply the Prisma migration against a real Supabase (or local Postgres) instance and verify the `activities` table and case-insensitive unique index exist as designed
- [x] 7.3 Verify `npm run build` compiles with no TypeScript errors and no unused imports/variables (`noUnusedLocals`)

## 8. Manual Endpoint Testing with curl (MANDATORY - AGENT MUST EXECUTE)

- [x] 8.1 Start the backend and confirm startup fails fast with a clear error when `DATABASE_URL`/`DIRECT_URL` are missing, then confirm normal startup with valid values
- [x] 8.2 `curl` `GET /api/activities` (no filters) — verify pagination defaults and response shape
- [x] 8.3 `curl` `GET /api/activities?search=<term>&page=&limit=` — verify search and limit-cap behavior
- [x] 8.4 `curl` `POST /api/activities` with a valid unique name — verify 201, then clean up (delete the test row directly via Prisma/SQL, since there is no DELETE endpoint) to restore prior state
- [x] 8.5 `curl` `POST /api/activities` with a duplicate name (case variation) — verify 409
- [x] 8.6 `curl` `POST /api/activities` with missing/empty/too-long `name` — verify 400 for each case
- [x] 8.7 `curl` `PUT /api/activities/{id}` for an existing test activity — verify 200 and updated `updatedAt`, then revert the name to its original value
- [x] 8.8 `curl` `PUT /api/activities/{id}` for a non-existent `id` — verify 404
- [x] 8.9 `curl` `PUT /api/activities/{id}` renaming to another existing activity's name — verify 409
- [x] 8.10 `curl` `PATCH /api/activities/{id}/status` toggling `active` false→true→false — verify 200 each time, end state matches original
- [x] 8.11 `curl` `PATCH /api/activities/{id}/status` for a non-existent `id` — verify 404
- [x] 8.12 `curl` `GET /api/activities/export` (with and without `search`) — verify a valid, non-empty `.xlsx` stream is returned with correct `Content-Type`
- [x] 8.13 Confirm no test data was left behind after the above (delete any records created for testing directly via Prisma/SQL, since there is no DELETE endpoint)

## 9. E2E Testing (Not Applicable)

- [x] 9.1 Confirm no front-end/UI work is included in this change (per proposal Out-of-Scope) — Playwright E2E is not applicable; document this explicitly rather than skip silently

## 10. Update Technical Documentation (MANDATORY)

- [x] 10.1 Update `docs/data-model.md` with the `Activity` entity (first persistent entity documented in this project): fields, validation rules, indexes/constraints, lifecycle, audit requirements
- [x] 10.2 Update `docs/development_guide.md` to document the Supabase connection strategy (`DATABASE_URL`/`DIRECT_URL`) for this feature, alongside the existing Dockerized-Postgres instructions
- [x] 10.3 Update `docs/api-spec.yml` with the five new `/api/activities*` endpoints and their schemas (request/response/error)
- [x] 10.4 Update `.env.example` (already covered in 1.5 — verify it is committed and documented, not just added)

## 11. External Dependencies / Blocked

- [ ] 11.1 **BLOCKED**: Authorization/permission model for `/api/activities*` endpoints is explicitly out of scope for VN-4175 per the reporter's answer ("Abierto por ahora, no hay permisos"). Must be resolved in a follow-up ticket before these endpoints are exposed in a production environment without network-level protection.
