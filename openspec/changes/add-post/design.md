## Context

`activities-management` is implemented as a standard Clean Architecture / DDD vertical slice: `presentation/routes` → `presentation/controllers` → `application/services` → `domain/repositories` (interface) → `infrastructure/repositories` (Prisma implementation) → PostgreSQL (Supabase). `GET`, `PUT`, `PATCH /status`, and `GET /export` are implemented today; `POST` is not. The `activities` table, its non-unique `name` index, and its case-insensitive unique index (`activities_name_lower_key`, hand-written in migration SQL since Prisma schema syntax has no expression-index support) already exist and require no changes. `docs/api-spec.yml` and `docs/data-model.md` already document this endpoint's exact contract, since it previously shipped under VN-4175 — this design restores that contract rather than inventing a new one.

## Goals / Non-Goals

**Goals:**
- Restore `POST /api/activities` with behavior, contract, and error handling identical to the previously-shipped implementation and to the still-current documentation in `docs/api-spec.yml` / `docs/data-model.md`.
- Keep the create path consistent with the sibling `update` path (same validator, same error envelope, same layering).
- Close the create/update duplicate-name race condition at the database level, not just the application level.

**Non-Goals:**
- Authorization/permissions on any `/api/activities*` endpoint (tracked as an explicit out-of-scope follow-up; network-level protection is the only safeguard for now).
- Any change to `GET`, `PUT`, `PATCH /status`, `GET /export`, the Prisma schema, or migrations.
- Any frontend/UI work.

## Decisions

- **Layering**: Restore `create()` at each layer exactly where `update()` already lives, mirroring its structure (domain interface → infrastructure implementation → application service → presentation controller → route). Alternative considered: a combined "upsert" method — rejected, since the project's REST contract and OpenAPI spec already define `create` and `update` as separate operations with different semantics (`201` vs `200`, no existence check vs required existence check).
- **Validation**: Reuse the existing `validateActivityName` validator from `backend/src/application/validator.ts` (already used by `update`) instead of writing a parallel validator. This guarantees the same trimming/length/emptiness rules apply to both create and update, per `docs/backend-standards.md`'s Input Normalization rule.
- **Duplicate detection**: Two-layer defense, matching the pattern already used by `update()`:
  1. Application-layer pre-check via `findByNameCaseInsensitive(name)` — throws `ConflictError` before hitting the database if an obvious duplicate exists.
  2. Database-layer authority: the pre-check alone is not race-safe under concurrent requests (TOCTOU). `ActivityRepository.create()` MUST wrap `prisma.activity.create(...)` in a try/catch that inspects the error for Prisma code `P2002` (unique constraint violation) and translates it into `ConflictError`, exactly like `ActivityRepository.update()` already does. Any other error is rethrown unchanged so the raw ORM error never reaches the client.
- **`createdBy`**: Always persisted as `null` on create, since no authorization/identity layer exists to populate it. No design work needed here beyond accepting the existing schema default.
- **Response shape**: Reuse the standard project envelope (`{ success, data, message }` / `{ success: false, error: { message, code } }`) already used by every other activity endpoint — no new envelope variant.

## Architecture / Affected Layers

| Layer | File | Change |
|---|---|---|
| Domain (repository contract) | `backend/src/domain/repositories/IActivityRepository.ts` | Add `CreateActivityData` interface and `create(data): Promise<Activity>` to `IActivityRepository` |
| Infrastructure | `backend/src/infrastructure/repositories/ActivityRepository.ts` | Implement `create()`, including `P2002` → `ConflictError` translation |
| Application | `backend/src/application/services/activityService.ts` | Implement `create(name, createdBy?)` with pre-check + delegation |
| Presentation (controller) | `backend/src/presentation/controllers/activityController.ts` | Add `create` handler using existing `validateActivityName` and the existing `handleError` |
| Presentation (route) | `backend/src/presentation/routes/activityRoutes.ts` | Register `router.post('/activities', controller.create)` |
| Spec | `openspec/specs/activities-management/spec.md` | Add "Create a new activity" requirement + scenarios (delta spec in this change) |

No new files, modules, or external packages are introduced.

## Configuration

No new environment variables or configuration. Reuses the existing `DATABASE_URL`/`DIRECT_URL` Prisma connection and the existing `serverConfig`/`databaseConfig` validation already in place.

## External Integrations

None beyond the existing Prisma → PostgreSQL (Supabase) connection already used by every other activity endpoint.

## Validation

- `name`: required, must be a string, trimmed, non-empty after trimming, ≤100 characters — identical rule to `update`, enforced via the shared `validateActivityName` validator (HTTP 400 on failure, `VALIDATION_ERROR` code).
- No other fields are accepted in the request body; `active` and `createdBy` are never read from the client.

## Error Handling

| Condition | HTTP | `error.code` |
|---|---|---|
| `name` missing / empty / whitespace-only / >100 chars | 400 | `VALIDATION_ERROR` |
| Duplicate name (case-insensitive), caught by app-layer pre-check or DB `P2002` | 409 | `CONFLICT` |
| Unexpected error (DB down, etc.) | 500 | `INTERNAL_ERROR` |

Raw Prisma/ORM errors MUST NOT reach the client; the repository layer is the only place allowed to inspect Prisma error codes, per `docs/backend-standards.md`'s Database Constraint Error Translation rule.

## Security

No new attack surface: input is limited to a single bounded string field, validated and length-capped before persistence. Authorization remains explicitly out of scope for this change (see Non-Goals) — do not add ad hoc auth checks here, since partial coverage across only one endpoint would be inconsistent with the rest of the capability.

## Observability

No new logging/metrics requirements beyond what the existing layers already provide (errors propagate to the existing centralized error handling in the controller). No structured logging changes needed.

## Retry / Timeout / Caching

Not applicable — a single synchronous create request with no external calls beyond the existing Prisma/Postgres connection (which already has its own pooling/timeout behavior, unchanged by this addition).

## Test Strategy

Per `docs/backend-standards.md` (AAA pattern, `should_[expected_behavior]_when_[condition]` naming, files under `backend/src/_test/` mirroring `src/`, 90% coverage threshold):
- `activityService.test.ts` → `create`: creates when no duplicate exists; throws `ConflictError` when a duplicate exists.
- `activityController.test.ts` → `create`: 201 on success; 400 when `name` missing; 409 on service conflict.
- `ActivityRepository.test.ts` → `create`: persists with `createdBy` defaulted to `null`; translates `P2002` into `ConflictError`; propagates unexpected errors unchanged.
- `activityRoutes.test.ts`: routes `POST /api/activities` to `controller.create`.

Manual `curl` verification is required per `docs/openspec-tasks-mandatory-steps.md` (successful creation, duplicate name, missing name, over-length name), including cleanup of any created rows.

## Deployment / Environment Considerations

No deployment-order dependency — the database schema and unique index already exist in every environment (they were never removed). This is a pure application-code change; standard deploy of the backend service is sufficient. No feature flag needed, since the endpoint simply did not exist before (safe to add without a rollout gate).

## Open Questions

None blocking. The one adjacent open item — authorization/permissions for `/api/activities*` — is intentionally out of scope for this change and is tracked as a follow-up dependency in the original VN-4175 proposal, not a blocker for restoring `POST /api/activities` under the same no-auth posture as the other endpoints.
