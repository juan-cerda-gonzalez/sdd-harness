const POSTGRES_URL_PATTERN = /^postgresql:\/\/.+/;

export interface DatabaseConfig {
  databaseUrl: string;
  directUrl: string;
}

function assertValidPostgresUrl(varName: string, value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  if (!POSTGRES_URL_PATTERN.test(value)) {
    throw new Error(`Invalid ${varName}: must be a valid postgresql:// connection string`);
  }
  return value;
}

export function loadDatabaseConfig(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const databaseUrl = assertValidPostgresUrl('DATABASE_URL', env.DATABASE_URL);
  const directUrl = assertValidPostgresUrl('DIRECT_URL', env.DIRECT_URL);
  return { databaseUrl, directUrl };
}
