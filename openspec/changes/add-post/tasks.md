## 1. Branch Setup (MANDATORY — must be first)

- [x] 1.1 Create and switch to feature branch `feature/VN-4198-backend` (or `feature/add-post-backend`) from the current backend base branch. **Already on `feature/VN-4198-backend`.**

## 2. Domain Layer

- [x] 2.1 In `backend/src/domain/repositories/IActivityRepository.ts`, add back the `CreateActivityData` interface (`{ name: string; createdBy?: string | null }`).
- [x] 2.2 In the same file, add back `create(data: CreateActivityData): Promise<Activity>` to the `IActivityRepository` interface.

## 3. Infrastructure Layer

- [x] 3.1 In `backend/src/infrastructure/repositories/ActivityRepository.ts`, implement `create()` calling `this.prisma.activity.create({ data: { name: data.name, createdBy: data.createdBy ?? null } })`.
- [x] 3.2 Wrap the Prisma call in try/catch: translate a Prisma `P2002` unique-constraint violation into `ConflictError` (reuse the existing `isUniqueConstraintViolation` helper already used by `update()`); rethrow any other error unchanged.

## 4. Application Layer

- [x] 4.1 In `backend/src/application/services/activityService.ts`, implement `create(name: string, createdBy?: string | null): Promise<Activity>`: call `findByNameCaseInsensitive(name)`, throw `ConflictError` if a match exists, otherwise delegate to `repository.create({ name, createdBy })`.

## 5. Presentation Layer

- [x] 5.1 In `backend/src/presentation/controllers/activityController.ts`, add the `create` handler: validate `req.body?.name` via the existing `validateActivityName`, call `activityService.create(name)`, respond `201` with `{ success: true, data: activity, message: 'Activity created successfully' }`; delegate errors to the existing `handleError`.
- [x] 5.2 In `backend/src/presentation/routes/activityRoutes.ts`, register `router.post('/activities', controller.create);`.

## 6. Review and Update Existing Unit Tests (MANDATORY)

- [x] 6.1 In `backend/src/_test/domain/repositories/IActivityRepository.ts`-related mocks (e.g. `activityService.test.ts`, `ActivityRepository.test.ts` mock factories), add back a `create: jest.fn()` mock entry wherever the repository/service mock was previously trimmed down.
- [x] 6.2 In `backend/src/_test/application/services/activityService.test.ts`, add back a `describe('create', ...)` block: creates when no duplicate exists (asserts `repository.create` called with `{ name, createdBy: undefined }`); throws `ConflictError` when a duplicate exists (asserts `repository.create` not called).
- [x] 6.3 In `backend/src/_test/presentation/controllers/activityController.test.ts`, add back a `describe('create', ...)` block: returns 201 with the created activity; returns 400 when `name` is missing; returns 409 when the service reports a conflict.
- [x] 6.4 In `backend/src/_test/infrastructure/repositories/ActivityRepository.test.ts`, add back a `describe('create', ...)` block: persists with `createdBy` defaulted to `null`; translates a unique-constraint violation into `ConflictError`; propagates unexpected database errors unchanged.
- [x] 6.5 In `backend/src/_test/presentation/routes/activityRoutes.test.ts`, add back the `create` mock handler and the `POST /api/activities` routing assertion.

## 7. Run Unit Tests and Verify Database State (MANDATORY)

- [x] 7.1 Run `npx tsc --noEmit` from `backend/` and confirm zero errors. **Result: clean, no errors.**
- [x] 7.2 Run `npx jest --coverage` from `backend/` and confirm all tests pass with 90%+ statements/branches/functions/lines on touched files. **Result: 87/87 tests passed; 100% statements/functions/lines, 97.14% branches on all files.**
- [x] 7.3 Confirm no schema/migration changes are needed (the `activities` table and its unique index already exist) — verify with `npx prisma migrate status` if any doubt arises. **Result: `npx prisma migrate status` → "Database schema is up to date!" (2 migrations found, none pending).**

## 8. Manual Endpoint Testing with curl (MANDATORY - AGENT MUST EXECUTE)

- [x] 8.1 Start the backend locally (`npm run dev` in `backend/`). **Result: an existing dev server on port 3000 was running stale code (started before this change's edits, no hot-reload with plain `ts-node`); restarted it (`Stop-Process` on the process owning port 3000, then `npm run dev` again) so it served the updated build.**
- [x] 8.2 `curl -X POST http://localhost:3000/api/activities -H "Content-Type: application/json" -d '{"name":"Demo Activity VN4198"}'` — **Result: HTTP 201**, `{"success":true,"data":{"id":3,"name":"Demo Activity VN4198","active":true,"createdAt":"2026-08-07T19:09:21.686Z","updatedAt":"2026-08-07T19:09:21.686Z","createdBy":null},"message":"Activity created successfully"}`.
- [x] 8.3 `curl -X POST http://localhost:3000/api/activities -d '{"name":"demo activity vn4198"}'` (different case) — **Result: HTTP 409**, `{"success":false,"error":{"message":"An activity named \"demo activity vn4198\" already exists","code":"CONFLICT"}}`.
- [x] 8.4 `curl -X POST http://localhost:3000/api/activities -d '{}'` and `-d '{"name":""}'` — **Result: both HTTP 400**, `{"success":false,"error":{"message":"name is required and must be a non-empty string","code":"VALIDATION_ERROR"}}`.
- [x] 8.5 `curl -X POST http://localhost:3000/api/activities -d '{"name":"<101 a's>"}'` — **Result: HTTP 400**, `{"success":false,"error":{"message":"name must be at most 100 characters","code":"VALIDATION_ERROR"}}`.
- [x] 8.6 Cleanup — **Result:** `curl -X PATCH http://localhost:3000/api/activities/3/status -d '{"active": false}'` → HTTP 200, `active: false`. Confirmed via `curl "http://localhost:3000/api/activities?search=Demo+Activity+VN4198"` → row present with `active: false`. No residual active test data left behind.

## 9. E2E Testing with Playwright MCP (Not Applicable)

- [x] 9.1 **N/A**: this change is backend-only (no frontend workflow touches `POST /api/activities` yet). Skip Playwright E2E; re-evaluate if/when a frontend "create activity" flow is added.

## 10. Update Technical Documentation (MANDATORY)

- [x] 10.1 Confirm `docs/api-spec.yml` (`POST /api/activities` under `/api/activities`) still matches the implementation exactly — **Result: confirmed, `docs/api-spec.yml` already documents `post:` under `/api/activities` with `CreateActivityRequest`/`ActivityResponse` schemas matching the restored implementation exactly. No edit needed.**
- [x] 10.2 Confirm `docs/data-model.md` (`Activity` entity, "Creation: via `POST /api/activities`") still matches — **Result: confirmed at `docs/data-model.md:99`. No edit needed.**
- [x] 10.3 No `.env.example` changes required — **Result: confirmed, no new environment variables introduced.**

## 11. Out-of-Scope Follow-Up (tracked, not blocking)

- [ ] 11.1 **BLOCKED**: Authorization/permission model for `/api/activities*` endpoints remains explicitly out of scope for this change, consistent with VN-4175 and VN-4198's acceptance criteria. Must be resolved in a follow-up ticket before these endpoints are exposed in a production environment without network-level protection.
