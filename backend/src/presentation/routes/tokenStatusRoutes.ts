import { Router } from 'express';
import { TokenService } from '../../application/services/tokenService';
import { createTokenStatusHandler } from '../controllers/tokenStatusController';

export function createTokenStatusRouter(tokenService: TokenService): Router {
  const router = Router();
  router.get('/internal/auth/token-status', createTokenStatusHandler(tokenService));
  return router;
}

/** True outside production, or when diagnostics are explicitly enabled. */
export function areDiagnosticsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.ENABLE_DIAGNOSTICS === 'true') {
    return true;
  }
  return env.NODE_ENV !== 'production';
}
