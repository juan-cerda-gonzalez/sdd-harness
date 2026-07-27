## Context

Outbound integrations with external services (starting with Azure B2C-protected APIs) require a Bearer token obtained via OAuth 2.0 Client Credentials. The Jira ticket (VN-3878) specifies a 10-minute cache TTL and service-to-service scope (no end-user auth involved). The backend follows a layered DDD architecture (`domain/`, `application/`, `infrastructure/`, `presentation/`, `middleware/`), with tests centralized under `src/_test/` mirroring the source tree, per `docs/backend-standards.md`.

This capability currently has no consumer (no existing outbound integration calls it yet), and the story does not define how it should be invoked or tested. Per the "Controller and Endpoint Decision" rule in `docs/backend-standards.md`, this was resolved explicitly with the user: a **dev-only diagnostic endpoint** is required so the token/cache behavior can be exercised via curl/Postman during manual verification, since there is no other consumer flow yet.

## Goals / Non-Goals

**Goals:**
- Acquire and cache an Azure B2C access token for service-to-service calls, honoring a configurable TTL (default 10 minutes).
- Guarantee a single upstream token request under concurrent cache-miss access (single-flight).
- Automatically attach `Authorization: Bearer <token>` to every outbound HTTP call made by this microservice through the shared outbound HTTP client, by default.
- Fail closed and log (without leaking secrets) when token acquisition fails.
- Provide a development-only way to observe token/cache state without a real outbound consumer.

**Non-Goals:**
- Proactive token renewal before expiry (renewal is driven by cache expiration only, per the ticket's exclusions).
- End-user authentication or session management.
- Redis-backed distributed cache (documented as a future swap point, not implemented in v1).
- A production-facing API for this capability — the diagnostic endpoint is explicitly non-permanent and non-production.

## Decisions

**Layering follows existing DDD structure.**
- Domain: `ITokenProvider` interface (`getAccessToken(): Promise<string>`), kept framework-agnostic.
- Infrastructure: `azureB2CTokenClient` (HTTP client for the token POST) and `tokenCache` (TTL-based cache wrapper), under `src/infrastructure/auth/`.
- Application: `tokenService`, implementing `ITokenProvider`, orchestrating cache lookup, single-flight token acquisition, and cache writes.
- Middleware: `outboundAuthInterceptor`, wrapping the shared outbound HTTP client to inject the `Authorization` header.
- Presentation (diagnostic only): `tokenStatusController` + route, under `src/presentation/controllers/` and `src/presentation/routes/`.
- Tests: centralized under `src/_test/`, mirroring this structure (`_test/application/services`, `_test/infrastructure/auth`, `_test/infrastructure/config`, `_test/middleware`, `_test/presentation/controllers`).

Alternative considered: putting token acquisition directly in an HTTP client wrapper without a domain interface. Rejected because it would couple outbound callers to the Azure B2C implementation and violate the project's dependency-inversion convention (`ICandidateRepository`-style interfaces already used for repositories).

**Use an in-memory cache for v1.**
The service will use an in-memory TTL cache (`Map<string, { token: string; expiresAt: number }>`), with a configurable expiration time defaulting to 10 minutes. This decision is suitable for the initial deployment and avoids introducing Redis as an additional operational dependency. If the microservice is later deployed with multiple instances and token reuse must be coordinated across replicas, the cache implementation may be replaced by a distributed cache without changing the token acquisition contract (`ITokenProvider`).

**Single-flight via a shared in-flight promise.**
`tokenService` holds an in-progress `Promise<string>` while a token request is outstanding; concurrent callers await the same promise instead of issuing parallel HTTP requests. Rejected a locking/queue mechanism as unnecessary complexity for a single-process cache.

**Attach the token to every outbound call via the shared HTTP client, by default.**
The microservice routes all outbound HTTP requests through one shared HTTP client instance, and `outboundAuthInterceptor` is attached to that shared client so every outbound call automatically carries `Authorization: Bearer <access_token>` unless explicitly declared as an exception (dedicated unauthenticated client instance or an explicit per-request `skipAuth` flag). Exceptions are never inferred implicitly — every new outbound integration is authenticated by default. If token acquisition fails, the outbound request is not sent and the error propagates through the standard error-handling mechanism.

**Never cache failed responses.**
4xx/5xx responses and 200 responses with an empty `access_token` bypass the cache write and propagate an error. This matches the ticket's acceptance criteria directly.

**Secrets only from environment variables.**
`AZURE_B2C_CLIENT_SECRET` and related config are read from `process.env` with startup validation (per `backend-standards.md`'s "Validate Environment" pattern). No secret value is ever logged or committed.

**Send both `scope` and `resource`, pending final contract validation.**
The Azure B2C token request includes `grant_type`, `client_id`, `client_secret`, `scope`, and `resource`, with `scope` and `resource` sourced from environment configuration and never hardcoded. The exact request must still be validated against the approved Postman collection before the implementation is considered final (see Open Questions); the token client, tests, and documentation must be updated if that validation changes the parameter set.

**Dev-only diagnostic endpoint: `GET /internal/auth/token-status`.**
Registered only when `NODE_ENV !== 'production'` (or an explicit `ENABLE_DIAGNOSTICS` flag is not set) — it never exists in a production deployment, so no additional authentication is layered on top of the environment gate. Response shape: `{ cached: boolean, expiresInSeconds?: number }`. It never returns the raw token or secret. An optional `?forceRefresh=true` query parameter bypasses the cache and requests a fresh token from Azure B2C, returning the same non-sensitive shape — this is what allows manual verification (first call vs. cached reuse vs. forced refresh) without needing a real outbound integration yet.

## Risks / Trade-offs

- [In-memory cache is lost on cold start/redeploy] → Acceptable for v1 since a lost cache only triggers one extra token request; documented as the reason a distributed-cache swap-in point exists if the service becomes multi-instance.
- [Sending an unconfirmed `resource` parameter could produce a silently wrong request] → Mitigated by confirming the exact parameter set against the Postman collection before implementation is considered final.
- [Thundering herd of token requests when the cache entry expires under load] → Mitigated by single-flight protection in `tokenService`.
- [Client secret exposure] → The secret pasted in the Jira ticket description must be rotated before this integration reaches any shared environment; the new value must only exist in environment variables / the secrets manager.
- [Hanging outbound calls if Azure B2C is slow/unavailable] → Mitigated by an explicit `AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS` timeout and a bounded retry (1–2 attempts) limited to transient network errors, not 400/401 auth failures.
- [Attaching the token to every outbound call by default could leak it to a destination that should not receive it] → Mitigated by requiring any non-token integration to be an explicit, declared exception rather than relying on the interceptor to guess which destinations are exempt.
- [Diagnostic endpoint accidentally shipping to production] → Mitigated by gating registration on `NODE_ENV`/`ENABLE_DIAGNOSTICS` at the composition root, plus a test asserting the route is not registered when `NODE_ENV === 'production'`.
- [Diagnostic endpoint leaking the token via `forceRefresh`] → Mitigated by the response contract only ever including `cached`/`expiresInSeconds`, never the token value; enforced by a dedicated test.

## Open Questions

- Confirm the exact Azure B2C token request payload against the approved Postman collection, specifically whether the request requires only `scope` or both `scope` and `resource`.
