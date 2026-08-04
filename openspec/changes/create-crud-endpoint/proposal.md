## Why

The front-end needs a backend maintainer for **Activities** (`actividades`): a paginated, searchable list, create, edit, and soft-delete (active/inactive toggle), plus an Excel export. None of this exists today — the project has no Prisma schema, no persistent data model, and no CRUD endpoints yet (only the Azure B2C service-to-service auth layer from VN-3878). This change introduces the first persistent domain entity and its full backend service layer, per VN-4175.

## What Changes

- Add a new `Activity` domain entity backed by a PostgreSQL (Supabase) database, introduced via Prisma for the first time in this project.
- Add `GET /api/activities` — paginated, name-filterable (`ILIKE`) list, returning `id`, `name`, `active`, and pagination metadata.
- Add `POST /api/activities` — create an activity; rejects duplicate names (case-insensitive) with `409`.
- Add `PUT /api/activities/{id}` — rename an activity; validates existence (`404`) and duplicate name excluding itself (`409`).
- Add `PATCH /api/activities/{id}/status` — toggle `active`/`inactive` (soft delete; no physical deletion).
- Add `GET /api/activities/export` — stream the filtered list as an `.xlsx` file, reusing the list endpoint's filter logic.
- Add Prisma schema, migration, and Supabase connection configuration (`DATABASE_URL`, `DIRECT_URL`), documented in `.env.example` with placeholders only.
- Populate `docs/data-model.md` with the `Activity` entity (first persistent entity documented in this project).
- **BREAKING**: none — this is new functionality with no existing consumers.

## Capabilities

### New Capabilities
- `activities-management`: CRUD + soft-delete + paginated search + Excel export for the `Activity` maintainer entity.

### Modified Capabilities
(none — no existing capabilities change requirements)

## Impact

- **Affected code**: `backend/prisma/schema.prisma` (new), `backend/src/domain/models/Activity.ts`, `backend/src/domain/repositories/IActivityRepository.ts`, `backend/src/infrastructure/repositories/ActivityRepository.ts`, `backend/src/application/services/activityService.ts`, `backend/src/application/validator.ts`, `backend/src/presentation/controllers/activityController.ts`, `backend/src/presentation/routes/activityRoutes.ts`, `backend/src/index.ts` (route registration), `backend/src/_test/**` (mirrored tests).
- **Dependencies**: adds `prisma` / `@prisma/client` (not currently installed) and an Excel-generation library (e.g. `exceljs`) to `backend/package.json`.
- **Database**: first-time introduction of PostgreSQL via Supabase for this backend; connection strategy conflicts with `docs/development_guide.md`'s current Dockerized-Postgres setup and must be reconciled (see design.md).
- **Configuration**: new required env vars `DATABASE_URL`, `DIRECT_URL`; no real credentials committed.
- **Authorization**: none implemented in this change — explicitly out of scope per product answer on the source ticket; tracked as a follow-up dependency.
- **Documentation**: `docs/data-model.md` and `.env.example` updated; `docs/development_guide.md` updated to reflect the Supabase connection strategy for this feature.
