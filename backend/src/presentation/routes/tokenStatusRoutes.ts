import { Router } from 'express';
import { TokenService } from '../../application/services/tokenService';
import { createTokenStatusHandler } from '../controllers/tokenStatusController';

export function createTokenStatusRouter(tokenService: TokenService): Router {
  const router = Router();
  router.get('/internal/auth/token-status', createTokenStatusHandler(tokenService));
  return router;
}

/**
 * True only when diagnostics are explicitly enabled via ENABLE_DIAGNOSTICS=true
 * AND the environment is not production. Production always blocks this route,
 * regardless of the flag, since it exposes internal token-cache diagnostics.
 */
export function areDiagnosticsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ENABLE_DIAGNOSTICS === 'true' && env.NODE_ENV !== 'production';
}
