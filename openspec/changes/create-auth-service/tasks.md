## 0. Branch Setup (MANDATORY - must be first)

- [ ] 0.1 Create and switch to feature branch `feature/VN-3878-backend`

## 1. Security Prerequisite

- [ ] 1.1 Confirm the `client_secret` exposed in Jira ticket `VN-3878` has been rotated by the Azure B2C tenant owner before any real credential is used in this change
- [ ] 1.2 Use only the rotated secret, sourced from environment variables or the secrets manager; never hardcode, log, or commit credentials

## 2. Configuration

- [ ] 2.1 Add the following environment variables to `backend/.env.example` and the project setup documentation:
  - `AZURE_B2C_TOKEN_URL`
  - `AZURE_B2C_CLIENT_ID`
  - `AZURE_B2C_CLIENT_SECRET`
  - `AZURE_B2C_SCOPE`
  - `AZURE_B2C_RESOURCE`
  - `AZURE_B2C_TOKEN_CACHE_TTL_SECONDS` with default value `600`
  - `AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS` with default value `5000`
- [ ] 2.2 Add startup validation that throws a descriptive error if any required Azure B2C environment variable is missing, following the existing "Validate Environment" pattern in `docs/backend-standards.md`
- [ ] 2.3 Ensure `AZURE_B2C_SCOPE` and `AZURE_B2C_RESOURCE` are read from environment configuration and are never hardcoded
- [ ] 2.4 Add configuration tests verifying that application startup fails safely when either `AZURE_B2C_SCOPE` or `AZURE_B2C_RESOURCE` is missing

## 3. Domain Layer

- [ ] 3.1 Add `ITokenProvider` interface at `backend/src/domain/repositories/ITokenProvider.ts` with `getAccessToken(): Promise<string>`

## 4. Infrastructure Layer

- [ ] 4.1 Implement `azureB2CTokenClient` at `backend/src/infrastructure/auth/azureB2CTokenClient.ts`
- [ ] 4.2 Send a `POST` request with `Content-Type: application/x-www-form-urlencoded` to `AZURE_B2C_TOKEN_URL`
- [ ] 4.3 Include the following required parameters in the token request payload:
  - `grant_type=client_credentials`
  - `client_id`
  - `client_secret`
  - `scope`
  - `resource`
- [ ] 4.4 Source `scope` from `AZURE_B2C_SCOPE` and `resource` from `AZURE_B2C_RESOURCE`
- [ ] 4.5 Respect `AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS`
- [ ] 4.6 Implement a bounded retry of 1–2 attempts, limited to transient network errors; do not retry authentication, validation, or other non-transient failures
- [ ] 4.7 Validate that the final token request structure matches the approved Postman collection
- [ ] 4.8 Implement `tokenCache` at `backend/src/infrastructure/auth/tokenCache.ts` using an in-memory `Map<string, { token: string; expiresAt: number }>` with TTL-based `get` and `set`, sourcing the TTL from `AZURE_B2C_TOKEN_CACHE_TTL_SECONDS`

## 5. Application Layer

- [ ] 5.1 Implement `tokenService` at `backend/src/application/services/tokenService.ts` implementing `ITokenProvider`
- [ ] 5.2 Return the cached token when it is valid
- [ ] 5.3 When no valid token is cached, call `azureB2CTokenClient`, validate that `access_token` is non-empty, and store the valid token in the cache
- [ ] 5.4 Never cache failed responses, error responses, or successful responses that do not contain a valid `access_token`
- [ ] 5.5 Implement single-flight protection in `tokenService` so concurrent calls during a cache miss share one in-flight request instead of issuing multiple upstream calls
- [ ] 5.6 Add structured logging through the existing `Logger` in `backend/src/infrastructure/logger.ts` for:
  - token acquisition success
  - token acquisition failure, including status code only
  - cache hit
  - cache miss or refresh
- [ ] 5.7 Ensure the raw access token, client secret, `scope`, and `resource` values are never exposed in logs

## 6. Outbound Integration

- [ ] 6.1 Implement `outboundAuthInterceptor` at `backend/src/middleware/outboundAuthInterceptor.ts`
- [ ] 6.2 Make the interceptor call `tokenService.getAccessToken()` and set `Authorization: Bearer <token>` on outbound HTTP requests
- [ ] 6.3 Attach `outboundAuthInterceptor` to the microservice's shared outbound HTTP client so it applies to all outbound calls by default
- [ ] 6.4 Implement an explicit opt-out mechanism, using either a dedicated unauthenticated client instance or an explicit per-request flag recognized by the interceptor, for integrations that must not receive the token
- [ ] 6.5 Document that all new outbound integrations are authenticated by default unless they explicitly declare an exception
- [ ] 6.6 Ensure a failed token acquisition blocks the outbound request, prevents it from being sent, and propagates the error through the standard error-handling mechanism

## 7. Review and Update Existing Unit Tests (MANDATORY)

- [ ] 7.1 Review existing backend test suites for collisions with the new modules, paths, environment variables, or shared outbound HTTP client behavior introduced in this change
- [ ] 7.2 Add:
  - `tokenService.test.ts`
  - `azureB2CTokenClient.test.ts`
  - `tokenCache.test.ts`
  - `outboundAuthInterceptor.test.ts`
- [ ] 7.3 Add automated test coverage for:
  - `should_return_cached_token_when_cache_is_valid`
  - `should_request_new_token_when_cache_is_empty`
  - `should_request_new_token_when_cache_has_expired`
  - `should_include_scope_and_resource_in_token_request`
  - `should_send_configured_scope_and_resource_values_without_modification`
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
- [ ] 7.4 Mock the HTTP client, cache, environment configuration, and logger in all new unit tests; do not perform real network calls

## 8. Run Unit Tests and Verify Database State (MANDATORY - AGENT MUST EXECUTE)

- [ ] 8.1 Run `npm test` in `backend/`
- [ ] 8.2 Run `npm run test:coverage` in `backend/`
- [ ] 8.3 Confirm the 90% coverage threshold for branches, functions, lines, and statements on the new modules
- [ ] 8.4 Confirm no Prisma schema or database changes were introduced by this change
- [ ] 8.5 Confirm no database state restoration is required because this feature adds no persisted entities

## 9. Manual Verification (MANDATORY - AGENT MUST EXECUTE)

- [ ] 9.1 Start the backend development server by running `npm run dev` in `backend/`, using rotated Azure B2C development credentials in `backend/.env`
- [ ] 9.2 Confirm the configured token request contains:
  - `grant_type=client_credentials`
  - `client_id`
  - `client_secret`
  - `scope`
  - `resource`
- [ ] 9.3 Validate the token request against the approved Postman collection
- [ ] 9.4 Confirm Azure B2C returns a valid access token when both `scope` and `resource` are supplied
- [ ] 9.5 Trigger a first outbound call and confirm through logs that a token request was made and the resulting token was cached, without logging the token or secret
- [ ] 9.6 Trigger a second outbound call within the TTL window and confirm through logs that the cached token was reused without making a new upstream token request
- [ ] 9.7 Trigger multiple concurrent outbound calls during a forced cache miss and confirm through logs that only one upstream token request was made
- [ ] 9.8 Force cache expiry by temporarily lowering `AZURE_B2C_TOKEN_CACHE_TTL_SECONDS` and confirm a new token request is made after expiry
- [ ] 9.9 Verify that an outbound request made through the shared outbound HTTP client includes `Authorization: Bearer <token>` by default
- [ ] 9.10 Verify that a request made through an explicitly declared unauthenticated exception does not include the Authorization header
- [ ] 9.11 Simulate a token endpoint error using invalid credentials or an unreachable URL and confirm:
  - the error is logged without exposing credentials
  - no token value is cached
  - the outbound request is not sent
  - the failure propagates instead of silently continuing
- [ ] 9.12 Stop the development server and restore `backend/.env` to its original state after verification

## 10. E2E Testing with Playwright MCP

- [ ] 10.1 Not applicable: this change has no frontend workflow or UI impact; skip Playwright E2E coverage

## 11. Update Technical Documentation (MANDATORY)

- [ ] 11.1 Document all new environment variables in `backend/.env.example` and `docs/development_guide.md`
- [ ] 11.2 Document that both `scope` and `resource` are mandatory parameters in the Azure B2C Client Credentials token request
- [ ] 11.3 Add a short architecture note in `docs/backend-standards.md`, or in a dedicated document referenced from it, describing:
  - `ITokenProvider`
  - `azureB2CTokenClient`
  - `tokenService`
  - `tokenCache`
  - `outboundAuthInterceptor`
  - the shared authenticated outbound HTTP client
  - the explicit unauthenticated opt-out mechanism
- [ ] 11.4 Document that future outbound integrations must reuse the shared authentication mechanism rather than duplicating token acquisition logic