import 'dotenv/config';
import express from 'express';
import { getAzureB2CConfig } from './infrastructure/config/azureB2CConfig';
import { TokenCache } from './infrastructure/auth/tokenCache';
import { Logger } from './infrastructure/logger';
import { TokenService } from './application/services/tokenService';
import { createOutboundHttpClient, createUnauthenticatedHttpClient } from './middleware/outboundAuthInterceptor';
import { createTokenStatusRouter, areDiagnosticsEnabled } from './presentation/routes/tokenStatusRoutes';

// Fail fast if required Azure B2C configuration is missing.
getAzureB2CConfig();

const logger = new Logger();
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
