import 'dotenv/config';
import express from 'express';
import { getAzureB2CConfig } from './infrastructure/config/azureB2CConfig';
import { TokenCache } from './infrastructure/auth/tokenCache';
import { Logger } from './infrastructure/logger';
import { TokenService } from './application/services/tokenService';
import { createOutboundHttpClient, createUnauthenticatedHttpClient } from './middleware/outboundAuthInterceptor';
import { createTokenStatusRouter, areDiagnosticsEnabled } from './presentation/routes/tokenStatusRoutes';

const logger = new Logger();

// Fail fast if required Azure B2C configuration is missing or invalid. The
// error is logged with structured metadata before the process exits so the
// cause is visible in startup logs rather than only in the crash stack trace.
try {
  getAzureB2CConfig();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown configuration error';
  logger.error('Azure B2C configuration is invalid; aborting startup', { message });
  process.exit(1);
}

const tokenService = new TokenService(new TokenCache(), logger);

export const outboundHttpClient = createOutboundHttpClient(tokenService);
export const unauthenticatedHttpClient = createUnauthenticatedHttpClient();

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

if (areDiagnosticsEnabled()) {
  app.use(createTokenStatusRouter(tokenService));
}

app.listen(port, () => {
  logger.info(`Backend listening on port ${port}`);
});
