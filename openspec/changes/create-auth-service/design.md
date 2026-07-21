## Context

Outbound integrations with external services (starting with Azure B2C-protected APIs) require a Bearer token obtained via OAuth 2.0 Client Credentials. The Jira ticket (VN-3878) specifies a 10-minute cache TTL and service-to-service scope (no end-user auth involved). The backend already follows a layered DDD architecture (`domain/`, `application/`, `infrastructure/`, `presentation/`), so this integration must fit that structure rather than introduce a parallel pattern.

The exact token request parameter set (`scope` alone vs. `scope` and `resource` together) is intentionally left open pending review of the Postman collection referenced in the ticket; see Open Questions.

## Goals / Non-Goals

**Goals:**
- Acquire and cache an Azure B2C access token for service-to-service calls, honoring a configurable TTL (default 10 minutes).
- Guarantee a single upstream token request under concurrent cache-miss access (single-flight).
- Automatically attach `Authorization: Bearer <token>` to every outbound HTTP call made by this microservice through the shared outbound HTTP client, by default.
- Fail closed and log (without leaking secrets) when token acquisition fails.

**Non-Goals:**
- Proactive token renewal before expiry (renewal is driven by cache expiration only, per the ticket's exclusions).
- End-user authentication or session management.
- Redis-backed distributed cache (documented as a future swap point, not implemented in v1).

## Decisions

**Layering follows existing DDD structure.**
- Domain: `ITokenProvider` interface (`getAccessToken(): Promise<string>`), kept framework-agnostic.
- Infrastructure: `azureB2CTokenClient` (HTTP client for the token POST) and `tokenCache` (TTL-based cache wrapper).
- Application: `tokenService`, implementing `ITokenProvider`, orchestrating cache lookup, single-flight token acquisition, and cache writes.
- Middleware: `outboundAuthInterceptor`, wrapping the outbound HTTP client to inject the `Authorization` header.

Alternative considered: putting token acquisition directly in an HTTP client wrapper without a domain interface. Rejected because it would couple outbound callers to the Azure B2C implementation and violate the project's dependency-inversion convention (`ICandidateRepository`-style interfaces already used for repositories).

**Use an in-memory cache for v1.**
The service will use an in-memory TTL cache (`Map<string, { token: string; expiresAt: number }>`), with a configurable expiration time defaulting to 10 minutes. This decision is suitable for the initial deployment and avoids introducing Redis as an additional operational dependency.

If the microservice is later deployed with multiple instances and token reuse must be coordinated across replicas, the cache implementation may be replaced by a distributed cache without changing the token acquisition contract (`ITokenProvider`).

**Single-flight via a shared in-flight promise.**
`tokenService` holds an in-progress `Promise<string>` while a token request is outstanding; concurrent callers await the same promise instead of issuing parallel HTTP requests. Rejected a locking/queue mechanism as unnecessary complexity for a single-process cache.

**Attach the token to every outbound call via the shared HTTP client, by default.**
The microservice SHALL route all outbound HTTP requests through one shared HTTP client instance, and `outboundAuthInterceptor` SHALL be attached to that shared client so every outbound call automatically carries `Authorization: Bearer <access_token>` unless the call is explicitly declared as an exception. The injection is not limited to a single configured B2C-protected integration — it is the default behavior for all outbound traffic from this microservice.

If no valid cached token is available at request time, the service must acquire a new token before sending the outbound request. If token acquisition fails, the outbound request must not be sent and the error must be propagated through the standard error-handling mechanism.

**Exceptions must be explicit, not inferred.**
An outbound integration that must not use this token (for example, calling a service with a different auth scheme) SHALL be excluded only through an explicit opt-out mechanism (e.g., a dedicated unauthenticated client instance or an explicit per-request flag recognized by the interceptor) — never by defaulting to "no token" for unrecognized destinations. Every new outbound integration is authenticated by default unless it declares itself an exception.

**Never cache failed responses.**
4xx/5xx responses and 200 responses with an empty `access_token` bypass the cache write and propagate an error. This matches the ticket's acceptance criteria directly.

**Secrets only from environment variables.**
`AZURE_B2C_CLIENT_SECRET` and related config are read from `process.env` with startup validation (per `backend-standards.md`'s "Validate Environment" pattern). No secret value is ever logged or committed.

**Token request parameter set stays open pending contract validation.**
The exact Azure B2C token request payload must be confirmed against the approved Postman collection before implementation. The implementation must not remove or add the `resource` parameter based only on assumptions — it must follow the request structure validated against the target Azure B2C environment. The confirmed contract must be reflected in the token client implementation, environment configuration, integration tests, `docs/api-spec.yml` (when applicable), and the technical documentation for the integration.

**Use both `scope` and `resource` for token acquisition.**

The Azure B2C token request SHALL include the following parameters:

- `grant_type`
- `client_id`
- `client_secret`
- `scope`
- `resource`

Both `scope` and `resource` are required by the validated integration contract.

The values for `scope` and `resource` SHALL be supplied through environment configuration and SHALL NOT be hardcoded.

The token client implementation, automated tests, and technical documentation SHALL reflect this request structure.

## Risks / Trade-offs

- [In-memory cache is lost on cold start/redeploy] → Acceptable for v1 since a lost cache only triggers one extra token request; documented as the reason a distributed-cache swap-in point exists if the service becomes multi-instance.
- [Sending an unconfirmed `resource` parameter could produce a silently wrong request] → Mitigated by confirming the exact parameter set against the Postman collection before implementation; the request structure is not finalized until that validation happens.
- [Thundering herd of token requests when the cache entry expires under load] → Mitigated by single-flight protection in `tokenService`.
- [Client secret exposure] → The secret pasted in the Jira ticket description must be rotated before this integration reaches any shared environment; the new value must only exist in environment variables / the secrets manager.
- [Hanging outbound calls if Azure B2C is slow/unavailable] → Mitigated by an explicit `AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS` timeout and a bounded retry (1–2 attempts) limited to transient network errors, not 400/401 auth failures.
- [Attaching the token to every outbound call by default could leak it to a destination that should not receive it] → Mitigated by requiring any non-token integration to be an explicit, declared exception rather than relying on the interceptor to guess which destinations are exempt.

## Open Questions

- Confirm the exact Azure B2C token request payload against the approved Postman collection, specifically whether the request requires only `scope` or both `scope` and `resource`.
