import { Request, Response } from 'express';
import { TokenService } from '../../application/services/tokenService';

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
    } catch {
      res.status(502).json({ error: 'Failed to acquire Azure B2C access token' });
    }
  };
}
