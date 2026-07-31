import axios, { AxiosError } from 'axios';
import { AzureB2CConfig } from '../config/azureB2CConfig';

export class TokenRequestError extends Error {
  readonly statusCode?: number;

  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'TokenRequestError';
    this.statusCode = statusCode;
  }
}

class EmptyAccessTokenError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number) {
    super('Azure B2C token response did not contain an access_token');
    this.name = 'EmptyAccessTokenError';
    this.statusCode = statusCode;
  }
}

interface AzureB2CTokenResponse {
  access_token?: string;
}

const MAX_TRANSIENT_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 200;

function isTransientNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  // No response means the request never reached the server (timeout, DNS, connection reset).
  return error.response === undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Bounded exponential backoff: 200ms, 400ms, ... capped by MAX_TRANSIENT_RETRIES attempts. */
function retryDelayMs(attempt: number): number {
  return RETRY_BASE_DELAY_MS * 2 ** attempt;
}

async function requestToken(config: AzureB2CConfig): Promise<string> {
  // NOTE: both `scope` and `resource` are sent per the ticket's documented payload.
  // This must be validated against the approved Postman collection before the
  // implementation is considered final (see design.md Open Questions) — if the
  // collection shows `resource` is not required, drop it here.
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    scope: config.scope,
    resource: config.resource
  });

  const response = await axios.post<AzureB2CTokenResponse>(config.tokenUrl, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: config.tokenRequestTimeoutMs
  });

  const accessToken = response.data.access_token;
  if (!accessToken) {
    throw new EmptyAccessTokenError(response.status);
  }

  return accessToken;
}

export async function fetchAzureB2CToken(config: AzureB2CConfig): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_TRANSIENT_RETRIES; attempt += 1) {
    try {
      return await requestToken(config);
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt === MAX_TRANSIENT_RETRIES) {
        break;
      }
      await delay(retryDelayMs(attempt));
    }
  }

  if (lastError instanceof EmptyAccessTokenError) {
    throw new TokenRequestError(lastError.message, lastError.statusCode);
  }

  const axiosError = lastError as AxiosError;
  throw new TokenRequestError('Azure B2C token request failed', axiosError.response?.status);
}
