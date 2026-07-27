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

export function getAzureB2CConfig(): AzureB2CConfig {
  for (const varName of REQUIRED_ENV_VARS) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  return {
    tokenUrl: process.env.AZURE_B2C_TOKEN_URL as string,
    clientId: process.env.AZURE_B2C_CLIENT_ID as string,
    clientSecret: process.env.AZURE_B2C_CLIENT_SECRET as string,
    scope: process.env.AZURE_B2C_SCOPE as string,
    resource: process.env.AZURE_B2C_RESOURCE as string,
    tokenCacheTtlSeconds: process.env.AZURE_B2C_TOKEN_CACHE_TTL_SECONDS
      ? Number(process.env.AZURE_B2C_TOKEN_CACHE_TTL_SECONDS)
      : DEFAULT_TOKEN_CACHE_TTL_SECONDS,
    tokenRequestTimeoutMs: process.env.AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS
      ? Number(process.env.AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS)
      : DEFAULT_TOKEN_REQUEST_TIMEOUT_MS
  };
}
