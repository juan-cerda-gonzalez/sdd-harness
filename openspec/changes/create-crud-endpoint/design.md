## Context

This project's backend currently has no persistent database, no Prisma schema, and no domain entities — `docs/data-model.md` explicitly states "No project-specific persistent data model has been defined yet." The only existing backend feature is the Azure B2C service-to-service auth layer (VN-3878), which is stateless (in-memory token cache only). VN-4175 introduces the first persistent entity, `Activity`, and requires standing up Prisma + PostgreSQL from scratch, following the layered architecture already established for the auth feature (`domain/`, `application/`, `infrastructure/`, `presentation/`).

The source Jira ticket originally suggested `src/routes/`, but the existing codebase places routes under `src/presentation/routes/` (see `tokenStatusRoutes.ts`). This design follows the actual existing structure, not the ticket's suggested paths.

The ticket's open questions were resolved directly by the reporter/product owner in ticket comments:
1. Physical deletion is **not** in scope — `active` (soft delete) is the only deactivation mechanism.
2. Target database is **Supabase** directly (not the Dockerized PostgreSQL described in `docs/development_guide.md`).
3. `name` max length is **100 characters**.
4. No permission/authorization model is in scope for this ticket ("Abierto por ahora, no hay permisos").
5. Pagination: max **10** records per page; page count is unbounded (depends on data volume).

## Goals / Non-Goals

**Goals:**
- Stand up Prisma with a PostgreSQL (Supabase) datasource for the first time in this project.
- Implement full CRUD-minus-delete for `Activity`: list (paginated, searchable), create, update name, toggle active status.
- Implement a streamed `.xlsx` export that reuses the list endpoint's filter logic.
- Follow the existing layered architecture and testing standards (90% coverage, mirrored `_test/` structure).
- Document the new entity in `docs/data-model.md` (first entity in that document) and the new env vars in `.env.example`.

**Non-Goals:**
- Authorization/permissions for these endpoints (explicit external dependency, tracked separately).
- Physical deletion of `Activity` records.
- Any front-end/UI work.
- Reconciling the Dockerized-Postgres setup described in `docs/development_guide.md` with Supabase beyond documenting the new connection strategy for this feature (broader infra alignment is out of scope).

## Decisions

**1. Database: Supabase-hosted PostgreSQL, accessed via Prisma with pooled + direct URLs.**
- `DATABASE_URL` — transaction-mode pooler (`pgbouncer=true`), used by the running application (Prisma Client at runtime).
- `DIRECT_URL` — session-mode pooler, used only for `prisma migrate`.
- Both are added to `backend/prisma/schema.prisma` `datasource db` block (`url` / `directUrl`), validated at startup the same way `AZURE_B2C_*` vars are validated today (fail fast on missing/malformed value), and documented in `.env.example` with placeholders only — no real credentials, per `docs/backend-standards.md` Environment Variables rules.
- Alternative considered: keep the Dockerized Postgres from `docs/development_guide.md` for consistency with the rest of the project. Rejected because the ticket explicitly answers "Supabase directamente" as the target; local dev docs will be updated to describe both options (Docker for other future features vs. Supabase for this one) rather than silently diverging from the ticket.

**2. Soft delete via `active: boolean`, no `DELETE` endpoint.**
- Confirms the ticket's own resolution. `PATCH /api/activities/{id}/status` is the only deactivation path; `active` defaults to `true` on create.

**3. Pagination contract: `page` (1-based, default 1), `limit` (default 10, max 10, per product answer).**
- The list and export endpoints share one internal query-building function to guarantee identical filter/pagination semantics (DRY, per `docs/backend-standards.md`).
- Response includes `total` and computed `totalPages` in a `PaginationMetadata`-shaped object, consistent with the existing pattern in `docs/api-spec.yml` (`CandidateListResponse`).

**4. Case-insensitive duplicate-name check via `lower(name)` comparison (or Postgres `citext`/`ILIKE`), enforced at the application layer plus a case-insensitive unique index at the database layer.**
- Alternative considered: application-layer check only. Rejected — a DB-level unique index (on `lower(name)`) is needed to close the race-condition window between the duplicate check and the insert/update, since Prisma does not offer transactional read-then-write atomicity by default without an explicit transaction.

**5. Excel export via `exceljs`, streamed (not buffered) to the HTTP response.**
- `exceljs` supports a streaming workbook writer (`stream.xlsx.WorkbookWriter`) that writes directly to the `Response` object, matching the ticket's non-functional requirement to avoid buffering the entire file in memory.
- Export reuses the same repository query method as the list endpoint (same `search` filter, no pagination limit applied) to avoid duplicated filter logic.

**6. Response envelope follows `docs/backend-standards.md`: `{ success, data, message }` / `{ success: false, error: { message, code } }`.**
- The Spanish success/error copy from the original ticket ("Se ha editado la actividad correctamente") is treated as front-end display text, not hardcoded in the backend response, per the ticket's own enhanced description — backend returns `success`/`data`/`message` in English; localization is a front-end concern.

## Risks / Trade-offs

- **[Risk]** Supabase pooled connections (`pgbouncer=true`) don't support Prisma's prepared-statement caching the same way a direct connection does, which can cause subtle query failures under load. → **Mitigation**: use `DIRECT_URL` (session-mode pooler) exclusively for migrations as documented by Supabase/Prisma guidance, and add `?pgbouncer=true` handling verification to manual test steps.
- **[Risk]** This is the first Prisma/database setup in the project — misconfiguration could block all future persistence work. → **Mitigation**: fail-fast startup validation for `DATABASE_URL`/`DIRECT_URL` (mirrors the existing `AZURE_B2C_*` validation pattern), with explicit unit tests for missing/malformed values per `docs/backend-standards.md` Environment Variables rules.
- **[Risk]** No authorization on these endpoints means any caller with network access can mutate `Activity` data. → **Mitigation**: explicitly called out as an open dependency in proposal.md and tasks.md; must be resolved before production exposure, tracked as a blocked/follow-up task rather than silently shipped.
- **[Risk]** Local development docs (`docs/development_guide.md`) currently describe only Dockerized Postgres; introducing Supabase without updating that doc risks confusing future contributors. → **Mitigation**: update `docs/development_guide.md` as part of this change's documentation tasks.

## Open Questions

None outstanding — all ambiguities identified in the source ticket were resolved by the reporter's answers (see Context). The authorization non-goal is a known, explicitly deferred dependency rather than an open question.
