## Why

Outbound calls to external services require an OAuth 2.0 Client Credentials token from Azure B2C, but no such integration exists yet. Requesting a fresh token on every outbound call would waste calls against the identity provider and add latency, so the token must be acquired once and reused for its valid lifetime.

## What Changes

- Add an Azure B2C token client that requests an `access_token` via `POST` (`application/x-www-form-urlencoded`) using `client_id`, `client_secret`, `grant_type`, and `scope`.
- Add a token cache with a 10-minute TTL so the cached token is reused across outbound calls instead of re-requesting it every time.
- Add single-flight protection so concurrent requests during a cache miss trigger exactly one upstream token request.
- Add an outbound auth interceptor that injects `Authorization: Bearer <token>` into outgoing HTTP calls to external services.
- Add startup validation for the required Azure B2C environment variables (`AZURE_B2C_TOKEN_URL`, `AZURE_B2C_CLIENT_ID`, `AZURE_B2C_CLIENT_SECRET`, `AZURE_B2C_SCOPE`, `AZURE_B2C_TOKEN_CACHE_TTL_SECONDS`, `AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS`).
- Add structured logging for token acquisition success/failure and cache hit/miss, without ever logging the token or client secret.
- Failed token responses (4xx/5xx, or a 200 response with an empty `access_token`) must not be cached.

## Capabilities

### New Capabilities
- `b2c-service-authentication`: service-to-service OAuth 2.0 Client Credentials authentication against Azure B2C, including token caching, single-flight token acquisition, and automatic injection of the `Authorization` header on outbound calls to external services.

### Modified Capabilities
- None.

## Impact

- **Affected code**: new domain interface (`ITokenProvider`), new infrastructure modules (Azure B2C HTTP client, token cache), new application service (`tokenService`), new outbound HTTP interceptor/middleware.
- **Affected config**: new required environment variables for the Azure B2C token endpoint, client credentials, cache TTL, and request timeout.
- **Dependencies**: availability of the Azure B2C token endpoint in the target environment; optional Redis dependency if a multi-instance cache backend is later required.
- **Security**: the `client_secret` currently pasted in the Jira ticket description must be rotated before this integration reaches any shared environment, and the new value must only live in environment variables / the project's secrets manager.
