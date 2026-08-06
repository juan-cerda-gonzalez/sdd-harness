const DEFAULT_PORT = 3000;
const MIN_PORT = 1;
const MAX_PORT = 65535;

export interface ServerConfig {
  port: number;
}

function assertValidPort(rawValue: string): number {
  const trimmedValue = rawValue.trim();
  const port = Number(trimmedValue);

  if (
    !Number.isFinite(port) ||
    !Number.isInteger(port) ||
    port < MIN_PORT ||
    port > MAX_PORT
  ) {
    throw new Error(
      `Invalid PORT: must be an integer between ${MIN_PORT} and ${MAX_PORT}`
    );
  }

  return port;
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const rawPort = env.PORT;

  if (rawPort === undefined || rawPort.trim().length === 0) {
    return { port: DEFAULT_PORT };
  }

  return { port: assertValidPort(rawPort) };
}
