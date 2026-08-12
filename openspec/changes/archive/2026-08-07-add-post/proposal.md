## Why

The `activities-management` capability currently exposes `GET /api/activities`, `PUT /api/activities/{id}`, `PATCH /api/activities/{id}/status`, and `GET /api/activities/export`, but has no way to create a new activity. `POST /api/activities` previously existed (delivered under VN-4175) and was intentionally removed from the codebase to run a live demonstration of the OpenSpec-driven methodology. This change (source: Jira **VN-4198**) restores that capability end-to-end, driven from spec first.

## What Changes

- Add `POST /api/activities` to create a new activity from a `name`.
- Add request validation: `name` required, non-empty after trimming, ≤100 characters (same rule already enforced on `PUT`).
- Add a case-insensitive duplicate-name pre-check at the application layer, backed by the existing database-level unique index (`activities_name_lower_key`) as the final authority — a Prisma `P2002` violation on create MUST be translated to a `409 Conflict`, never returned as a raw `500`.
- Add persistence via Prisma, with `active` defaulting to `true` and `createdBy` defaulting to `null` (no authorization/identity layer exists yet).
- No breaking changes — this is a pure addition; no existing endpoint, contract, or field changes.

## Capabilities

### New Capabilities
(none — this extends an existing capability)

### Modified Capabilities
- `activities-management`: adds the "Create a new activity" requirement (`POST /api/activities`) and its scenarios to `openspec/specs/activities-management/spec.md`. All other requirements in that spec (list, update, status toggle, export, error envelope) are unchanged.

## Impact

- **Affected code (backend, Clean Architecture / DDD layers):**
  - `backend/src/domain/repositories/IActivityRepository.ts` — add back `CreateActivityData` and the `create()` contract method.
  - `backend/src/infrastructure/repositories/ActivityRepository.ts` — add back `create()`, including Prisma `P2002` → `ConflictError` translation.
  - `backend/src/application/services/activityService.ts` — add back `create(name, createdBy?)` with the duplicate pre-check.
  - `backend/src/presentation/controllers/activityController.ts` — add back the `create` handler (reuses the existing `validateActivityName` validator, already shared with `update`).
  - `backend/src/presentation/routes/activityRoutes.ts` — add back `router.post('/activities', controller.create)`.
- **Not affected:** `backend/prisma/schema.prisma` and migrations (table and unique index already exist); `GET`, `PUT`, `PATCH /status`, `GET /export` endpoints; frontend/UI; `docs/api-spec.yml` and `docs/data-model.md` (already describe this endpoint and require no edits).
- **Dependencies:** none beyond the existing Prisma/Supabase connection already configured for the other endpoints.
- **Risks:** low — this restores previously-shipped, previously-tested behavior rather than introducing new design. The main risk is drift between the restored implementation and the documented contract in `docs/api-spec.yml`; scenarios in the spec delta guard against that.
- **Assumptions:**
  - Authorization/permissions for `/api/activities*` remain explicitly out of scope (per the VN-4175 proposal and carried into VN-4198's acceptance criteria); network-level protection is the only safeguard until a dedicated follow-up ticket addresses it.
  - `createdBy` stays unpopulated (`null`) on every create, consistent with the existing schema and the other endpoints.
