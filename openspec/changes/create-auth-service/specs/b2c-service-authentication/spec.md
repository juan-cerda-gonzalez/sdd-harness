## ADDED Requirements

### Requirement: Azure B2C Token Acquisition
The system SHALL request an `access_token` from the configured Azure B2C token endpoint using the OAuth 2.0 Client Credentials grant, sending `grant_type`, `client_id`, `client_secret`, and `scope` as an `application/x-www-form-urlencoded` POST body.

#### Scenario: Successful token request
- **WHEN** the token endpoint returns HTTP 200 with a non-empty `access_token`
- **THEN** the system extracts and returns the `access_token`

#### Scenario: Token endpoint returns an error status
- **WHEN** the token endpoint returns HTTP 400, 401, or 500
- **THEN** the system logs the failure with the status code, does not cache a response, and propagates an error to the caller

#### Scenario: Token endpoint returns an empty access token
- **WHEN** the token endpoint returns HTTP 200 but the `access_token` field is empty or missing
- **THEN** the system treats the response as a failure, does not cache it, and propagates an error to the caller

### Requirement: Token Caching with Fixed TTL
The system SHALL cache a successfully acquired `access_token` for a configurable TTL, defaulting to 10 minutes (600 seconds), and SHALL reuse the cached token for all outbound requests until it expires.

#### Scenario: Token reused within TTL
- **WHEN** a valid, non-expired token exists in the cache
- **THEN** the system returns the cached token without calling the Azure B2C token endpoint

#### Scenario: Token cache miss
- **WHEN** no token exists in the cache
- **THEN** the system requests a new token from Azure B2C and stores the result in the cache with the configured TTL

#### Scenario: Token cache expired
- **WHEN** the cached token's TTL has elapsed
- **THEN** the next request for a token triggers a new call to the Azure B2C token endpoint and refreshes the cache

### Requirement: Single-Flight Token Acquisition
The system SHALL ensure that concurrent requests for a token during a cache miss result in exactly one upstream call to the Azure B2C token endpoint.

#### Scenario: Concurrent requests during cache miss
- **WHEN** multiple callers request a token simultaneously while the cache is empty or expired
- **THEN** the system issues a single request to the Azure B2C token endpoint and all callers receive the resulting token

### Requirement: Outbound Authorization Header Injection
The system SHALL automatically attach an `Authorization: Bearer <token>` header, using the cached or freshly acquired token, to every outbound HTTP request made through the microservice's shared outbound HTTP client, by default. The system SHALL NOT limit this injection to a single configured external integration. An outbound call SHALL only be excluded from token injection when it is explicitly declared as an exception (e.g., a dedicated unauthenticated client instance or an explicit per-request opt-out flag); the system SHALL NOT infer an exception implicitly.

#### Scenario: Outbound call through the shared client includes Authorization header
- **WHEN** the system makes an outbound HTTP call through the shared outbound HTTP client
- **THEN** the request includes an `Authorization` header with the format `Bearer <token>`

#### Scenario: Token acquisition failure blocks the outbound call
- **WHEN** no valid cached token is available and the system fails to acquire a new token
- **THEN** the outbound request is not sent and the error propagates through the standard error-handling mechanism

#### Scenario: Explicitly declared exception is not authenticated
- **WHEN** an outbound integration is explicitly declared as an exception to token injection
- **THEN** the system does not inject the `Authorization: Bearer <token>` header into that integration's requests

#### Scenario: New integration is authenticated by default
- **WHEN** a new outbound integration is added through the shared outbound HTTP client without declaring an exception
- **THEN** the system injects the `Authorization: Bearer <token>` header into its requests

### Requirement: Secret and Token Confidentiality
The system SHALL read `client_secret` and related Azure B2C credentials only from environment variables or the project's secrets manager, and SHALL never log the raw `access_token` or `client_secret` value, at any log level.

#### Scenario: Logging on token acquisition
- **WHEN** the system logs a token acquisition success, failure, cache hit, or cache miss
- **THEN** the log entry contains only metadata (for example status, cache state, expiry timestamp) and never the raw token or secret value

### Requirement: Startup Configuration Validation
The system SHALL validate that all required Azure B2C environment variables (`AZURE_B2C_TOKEN_URL`, `AZURE_B2C_CLIENT_ID`, `AZURE_B2C_CLIENT_SECRET`, `AZURE_B2C_SCOPE`) are present at startup and SHALL fail startup with a descriptive error if any are missing.

#### Scenario: Missing required environment variable
- **WHEN** the application starts and a required Azure B2C environment variable is not set
- **THEN** the system throws a startup error naming the missing variable

### Requirement: Token request contract

The system SHALL request an Azure B2C access token using the Client Credentials flow.

The request SHALL include:

- `grant_type=client_credentials`
- `client_id`
- `client_secret`
- `scope`
- `resource`

The system SHALL obtain `scope` and `resource` from environment configuration.