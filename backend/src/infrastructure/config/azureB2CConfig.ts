export interface AzureB2CConfig {
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  resource: string;
  tokenCacheTtlSeconds: number;
  tokenRequestTimeoutMs: number;
}

const REQUIRED_ENV_VARS = [
  'AZURE_B2C_TOKEN_URL',
  'AZURE_B2C_CLIENT_ID',
  'AZURE_B2C_CLIENT_SECRET',
  'AZURE_B2C_SCOPE',
  'AZURE_B2C_RESOURCE'
] as const;

const DEFAULT_TOKEN_CACHE_TTL_SECONDS = 600;
const DEFAULT_TOKEN_REQUEST_TIMEOUT_MS = 5000;

function parsePositiveInt(varName: string, rawValue: string): number {
  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Environment variable ${varName} must be a positive integer, got: ${rawValue}`);
  }
  return parsed;
}

export function getAzureB2CConfig(): AzureB2CConfig {
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  const rawTokenCacheTtlSeconds = process.env.AZURE_B2C_TOKEN_CACHE_TTL_SECONDS;
  const rawTokenRequestTimeoutMs = process.env.AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS;

  return {
    tokenUrl: process.env.AZURE_B2C_TOKEN_URL as string,
    clientId: process.env.AZURE_B2C_CLIENT_ID as string,
    clientSecret: process.env.AZURE_B2C_CLIENT_SECRET as string,
    scope: process.env.AZURE_B2C_SCOPE as string,
    resource: process.env.AZURE_B2C_RESOURCE as string,
    tokenCacheTtlSeconds: rawTokenCacheTtlSeconds
      ? parsePositiveInt('AZURE_B2C_TOKEN_CACHE_TTL_SECONDS', rawTokenCacheTtlSeconds)
      : DEFAULT_TOKEN_CACHE_TTL_SECONDS,
    tokenRequestTimeoutMs: rawTokenRequestTimeoutMs
      ? parsePositiveInt('AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS', rawTokenRequestTimeoutMs)
      : DEFAULT_TOKEN_REQUEST_TIMEOUT_MS
  };
}
