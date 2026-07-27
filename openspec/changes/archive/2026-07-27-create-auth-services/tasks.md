## 0. Branch Setup (MANDATORY - must be first)

- [x] 0.1 Create and switch to feature branch `feature/VN-3878-backend`

## 1. Security Prerequisite

- [ ] 1.1 BLOCKED (external action required): Confirm the `client_secret` exposed in Jira ticket `VN-3878` has been rotated by the Azure B2C tenant owner before any real credential is used in this change — requires action outside this session
- [ ] 1.2 BLOCKED (depends on 1.1): Use only the rotated secret in a real environment; the code guarantees the secret is read only from environment variables and is never hardcoded, logged, or committed (verified by `azureB2CConfig.ts` and the "should_not_log_token_secret_scope_or_resource_values" test), but actual use of the rotated value cannot be confirmed from this session

## 2. Configuration

- [x] 2.1 Add the following environment variables to `backend/.env.example` and `docs/development_guide.md`:
  - `AZURE_B2C_TOKEN_URL`
  - `AZURE_B2C_CLIENT_ID`
  - `AZURE_B2C_CLIENT_SECRET`
  - `AZURE_B2C_SCOPE`
  - `AZURE_B2C_RESOURCE`
  - `AZURE_B2C_TOKEN_CACHE_TTL_SECONDS` with default value `600`
  - `AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS` with default value `5000`
- [x] 2.2 Add startup validation that throws a descriptive error if any required Azure B2C environment variable is missing, following the "Validate Environment" pattern in `docs/backend-standards.md`
- [x] 2.3 Ensure `AZURE_B2C_SCOPE` and `AZURE_B2C_RESOURCE` are read from environment configuration and are never hardcoded
- [x] 2.4 Add configuration tests (under `backend/src/_test/infrastructure/config/`) verifying that application startup fails safely when any required Azure B2C environment variable is missing

## 3. Domain Layer

- [x] 3.1 Add `ITokenProvider` interface at `backend/src/domain/repositories/ITokenProvider.ts` with `getAccessToken(): Promise<string>`

## 4. Infrastructure Layer

- [x] 4.1 Implement `azureB2CTokenClient` at `backend/src/infrastructure/auth/azureB2CTokenClient.ts`
- [x] 4.2 Send a `POST` request with `Content-Type: application/x-www-form-urlencoded` to `AZURE_B2C_TOKEN_URL`
- [x] 4.3 Include `grant_type=client_credentials`, `client_id`, `client_secret`, `scope`, and `resource` in the token request payload
- [x] 4.4 Source `scope` from `AZURE_B2C_SCOPE` and `resource` from `AZURE_B2C_RESOURCE`
- [x] 4.5 Respect `AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS`
- [x] 4.6 Implement a bounded retry of 1–2 attempts, limited to transient network errors; do not retry authentication, validation, or other non-transient failures
- [ ] 4.7 BLOCKED: Validate that the final token request structure matches the approved Postman collection referenced in the ticket — the collection was not accessible in this session; implementation sends `grant_type`, `client_id`, `client_secret`, `scope`, and `resource` per the ticket/design, pending confirmation
- [x] 4.8 Implement `tokenCache` at `backend/src/infrastructure/auth/tokenCache.ts` using an in-memory `Map<string, { token: string; expiresAt: number }>` with TTL-based `get` and `set`, sourcing the TTL from `AZURE_B2C_TOKEN_CACHE_TTL_SECONDS`, and a way to read remaining TTL (needed by the diagnostic endpoint)

## 5. Application Layer

- [x] 5.1 Implement `tokenService` at `backend/src/application/services/tokenService.ts` implementing `ITokenProvider`
- [x] 5.2 Return the cached token when it is valid
- [x] 5.3 When no valid token is cached, call `azureB2CTokenClient`, validate that `access_token` is non-empty, and store the valid token in the cache
- [x] 5.4 Never cache failed responses, error responses, or successful responses that do not contain a valid `access_token`
- [x] 5.5 Implement single-flight protection in `tokenService` so concurrent calls during a cache miss share one in-flight request instead of issuing multiple upstream calls
- [x] 5.6 Expose a way for `tokenService` to report current cache status (cached/not cached, remaining TTL in seconds) without exposing the token value, for use by the diagnostic endpoint — `getStatus()` and `forceRefreshAccessToken()`
- [x] 5.7 Add structured logging through `Logger` (`backend/src/infrastructure/logger.ts`) for token acquisition success, token acquisition failure (status code only), cache hit, and cache miss/refresh
- [x] 5.8 Ensure the raw access token, client secret, `scope`, and `resource` values are never exposed in logs

## 6. Outbound Integration

- [x] 6.1 Implement `outboundAuthInterceptor` at `backend/src/middleware/outboundAuthInterceptor.ts`
- [x] 6.2 Make the interceptor call `tokenService.getAccessToken()` and set `Authorization: Bearer <token>` on outbound HTTP requests
- [x] 6.3 Attach `outboundAuthInterceptor` to the microservice's shared outbound HTTP client so it applies to all outbound calls by default
- [x] 6.4 Implement an explicit opt-out mechanism (dedicated unauthenticated client instance or explicit per-request flag) for integrations that must not receive the token
- [x] 6.5 Document that all new outbound integrations are authenticated by default unless they explicitly declare an exception
- [x] 6.6 Ensure a failed token acquisition blocks the outbound request, prevents it from being sent, and propagates the error through the standard error-handling mechanism

## 7. Dev-Only Diagnostic Endpoint

- [x] 7.1 Implement `tokenStatusController` at `backend/src/presentation/controllers/tokenStatusController.ts` handling `GET /internal/auth/token-status`, returning `{ cached: boolean, expiresInSeconds?: number }` and never the token/secret value
- [x] 7.2 Support `?forceRefresh=true` to bypass the cache and acquire a fresh token via `tokenService`, returning the same response shape
- [x] 7.3 Map token acquisition failures (forced refresh) to an error response that never includes the token, secret, or raw upstream response body
- [x] 7.4 Add the route at `backend/src/presentation/routes/tokenStatusRoutes.ts` and register it in the composition root (`backend/src/index.ts`) only when `NODE_ENV !== 'production'` (or an explicit `ENABLE_DIAGNOSTICS` flag is not set)
- [x] 7.5 Add a test asserting the route is not registered when `NODE_ENV=production`

## 8. Review and Update Existing Unit Tests (MANDATORY)

- [x] 8.1 Review existing backend test suites for collisions with the new modules, paths, environment variables, or shared outbound HTTP client behavior introduced in this change (fresh `backend/` project — no pre-existing suites to collide with)
- [x] 8.2 Add tests under the centralized `backend/src/_test/` tree, mirroring the source structure:
  - `_test/application/services/tokenService.test.ts`
  - `_test/infrastructure/auth/azureB2CTokenClient.test.ts`
  - `_test/infrastructure/auth/tokenCache.test.ts`
  - `_test/infrastructure/config/azureB2CConfig.test.ts`
  - `_test/middleware/outboundAuthInterceptor.test.ts`
  - `_test/presentation/controllers/tokenStatusController.test.ts`
  - `_test/infrastructure/logger.test.ts` (added for coverage of the shared logger)
- [x] 8.3 Add automated test coverage for:
  - `should_return_cached_token_when_cache_is_valid`
  - `should_request_new_token_when_cache_is_empty`
  - `should_request_new_token_when_cache_has_expired`
  - `should_include_scope_and_resource_in_token_request`
  - `should_fail_startup_when_scope_is_missing`
  - `should_fail_startup_when_resource_is_missing`
  - `should_not_cache_response_when_token_endpoint_returns_error_status`
  - `should_throw_error_when_access_token_is_missing_in_200_response`
  - `should_trigger_only_one_upstream_request_when_multiple_concurrent_calls_occur_during_cache_miss`
  - `should_include_authorization_header_when_calling_through_the_shared_outbound_client`
  - `should_not_send_request_when_token_acquisition_fails`
  - `should_not_include_authorization_header_when_integration_declares_an_explicit_exception`
  - `should_include_authorization_header_by_default_for_a_new_integration_without_declared_exception`
  - `should_not_log_token_secret_scope_or_resource_values`
  - `should_return_cached_true_when_token_status_is_requested_and_cache_is_valid`
  - `should_return_cached_false_when_token_status_is_requested_and_cache_is_empty`
  - `should_force_refresh_and_cache_new_token_when_forceRefresh_query_param_is_true`
  - `should_not_expose_token_or_secret_in_token_status_response_body`
  - `should_not_register_token_status_route_when_node_env_is_production`
- [x] 8.4 Mock the HTTP client, cache, environment configuration, and logger in all new unit tests; do not perform real network calls

## 9. Run Unit Tests and Verify Database State (MANDATORY - AGENT MUST EXECUTE)

- [x] 9.1 Run `npm test` in `backend/` — 58/58 tests passed
- [x] 9.2 Run `npm run test:coverage` in `backend/` — passed
- [x] 9.3 Confirm the 90% coverage threshold for branches, functions, lines, and statements on the new modules — 100% across all metrics
- [x] 9.4 Confirm no Prisma schema or database changes were introduced by this change — confirmed, no `prisma/` directory or schema added
- [x] 9.5 Confirm no database state restoration is required because this feature adds no persisted entities — confirmed

## 10. Manual Endpoint Testing with curl (MANDATORY - AGENT MUST EXECUTE)

No real Azure B2C dev tenant or rotated secret is available in this session (§1 blocked). Rather than skip manual verification, a temporary local HTTP server was used to stand in for the Azure B2C token endpoint (`AZURE_B2C_TOKEN_URL` pointed at `http://localhost:4400/token`), so the full request/response wiring could genuinely be exercised end-to-end instead of relying on unit-test mocks alone. This proves the integration and diagnostic endpoint work correctly; it does **not** prove the real Azure B2C tenant accepts the exact parameter set (still tracked as blocked in §4.7 / design.md Open Questions).

- [x] 10.1 Start the backend development server (`npm run dev` in `backend/`) with `NODE_ENV=development` and `AZURE_B2C_TOKEN_URL` pointed at a local mock token server (real Azure B2C credentials unavailable — see §1)
- [x] 10.2 `GET /internal/auth/token-status` on a cold start → `{"cached":false}`; mock server log confirmed no upstream call was triggered by the status check
- [x] 10.3 `GET /internal/auth/token-status?forceRefresh=true` → `{"cached":true,"expiresInSeconds":8}`; mock log confirmed one token request with the full parameter set; no token/secret value appeared in the response or backend logs (only "Azure B2C token acquisition succeeded")
- [x] 10.4 `GET /internal/auth/token-status` again within the TTL window → `{"cached":true,"expiresInSeconds":4}`; mock call count stayed at 1 (no new upstream call)
- [x] 10.5 Set `AZURE_B2C_TOKEN_CACHE_TTL_SECONDS=8` and waited past expiry → status returned `{"cached":false}`; `forceRefresh=true` afterward triggered a new (3rd) upstream call
- [x] 10.6 Put the mock server in a 401 failure mode and called `forceRefresh=true` → response `502 {"error":"Failed to acquire Azure B2C access token"}`; backend log showed `{"level":"error","message":"Azure B2C token acquisition failed","statusCode":401}` with no body/secret; confirmed via a follow-up status call that nothing was cached after the failure
- [x] 10.7 Stopped both the dev server and mock server (verified ports 3050/4400 no longer listening), deleted the temporary `backend/.env` and `server.log`, and removed the temporary mock-server script from the scratchpad directory (never part of the repo)

## 11. E2E Testing with Playwright MCP

- [x] 11.1 Not applicable: this change has no frontend workflow or UI impact; skip Playwright E2E coverage

## 12. Update Technical Documentation (MANDATORY)

- [x] 12.1 Document all new environment variables in `backend/.env.example` and `docs/development_guide.md`
- [x] 12.2 Document that both `scope` and `resource` are parameters in the Azure B2C Client Credentials token request, noting the pending Postman validation from design.md's Open Questions
- [x] 12.3 Add a short architecture note in `docs/backend-standards.md` describing `ITokenProvider`, `azureB2CTokenClient`, `tokenService`, `tokenCache`, `outboundAuthInterceptor`, the shared authenticated outbound HTTP client, and the explicit unauthenticated opt-out mechanism
- [x] 12.4 Document the `GET /internal/auth/token-status` diagnostic endpoint (route, response contract, `forceRefresh` parameter, and that it is dev-only and never ships to production) in `docs/backend-standards.md`
- [x] 12.5 Document that future outbound integrations must reuse the shared authentication mechanism rather than duplicating token acquisition logic
