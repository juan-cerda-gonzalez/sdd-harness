import { Request, Response } from 'express';
import { TokenService } from '../../application/services/tokenService';
import { TokenRequestError } from '../../infrastructure/auth/azureB2CTokenClient';

/**
 * Dev-only diagnostic endpoint. Never returns the raw token, secret, scope,
 * or resource value — only non-sensitive cache metadata.
 */
export function createTokenStatusHandler(tokenService: TokenService) {
  return async (req: Request, res: Response): Promise<void> => {
    const forceRefresh = req.query.forceRefresh === 'true';

    if (!forceRefresh) {
      res.status(200).json(tokenService.getStatus());
      return;
    }

    try {
      await tokenService.forceRefreshAccessToken();
      res.status(200).json(tokenService.getStatus());
    } catch (error) {
      // Upstream Azure B2C failures (network/HTTP) are distinguished from local
      // configuration errors so operators aren't misled into chasing an "outage"
      // that is actually an invalid env var. Neither branch leaks the raw error
      // message, which may echo back a raw env var value.
      if (error instanceof TokenRequestError) {
        res.status(502).json({ error: 'Failed to acquire Azure B2C access token' });
        return;
      }
      res.status(500).json({ error: 'Azure B2C token service is misconfigured' });
    }
  };
}
