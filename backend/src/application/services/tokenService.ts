import { ITokenProvider } from '../../domain/repositories/ITokenProvider';
import { AzureB2CConfig, getAzureB2CConfig } from '../../infrastructure/config/azureB2CConfig';
import { fetchAzureB2CToken, TokenRequestError } from '../../infrastructure/auth/azureB2CTokenClient';
import { TokenCache } from '../../infrastructure/auth/tokenCache';
import { Logger } from '../../infrastructure/logger';

const CACHE_KEY = 'azure-b2c-access-token';

export interface TokenStatus {
  cached: boolean;
  expiresInSeconds?: number;
}

export class TokenService implements ITokenProvider {
  private inFlightRequest: Promise<string> | undefined;

  constructor(
    private readonly cache: TokenCache,
    private readonly logger: Logger,
    private readonly loadConfig: () => AzureB2CConfig = getAzureB2CConfig
  ) {}

  async getAccessToken(): Promise<string> {
    const cachedToken = this.cache.get(CACHE_KEY);
    if (cachedToken) {
      this.logger.info('Azure B2C token cache hit');
      return cachedToken;
    }

    this.logger.info('Azure B2C token cache miss');

    if (this.inFlightRequest) {
      return this.inFlightRequest;
    }

    this.inFlightRequest = this.acquireAndCacheToken();

    try {
      return await this.inFlightRequest;
    } finally {
      this.inFlightRequest = undefined;
    }
  }

  /** Bypasses any cached value and forces a fresh token acquisition. */
  async forceRefreshAccessToken(): Promise<string> {
    this.cache.invalidate(CACHE_KEY);
    return this.getAccessToken();
  }

  /** Non-sensitive cache status: never exposes the token itself. */
  getStatus(): TokenStatus {
    const expiresInSeconds = this.cache.getRemainingTtlSeconds(CACHE_KEY);
    if (expiresInSeconds === undefined) {
      return { cached: false };
    }
    return { cached: true, expiresInSeconds };
  }

  private async acquireAndCacheToken(): Promise<string> {
    try {
      const config = this.loadConfig();
      const token = await fetchAzureB2CToken(config);
      this.cache.set(CACHE_KEY, token, config.tokenCacheTtlSeconds);
      this.logger.info('Azure B2C token acquisition succeeded');
      return token;
    } catch (error) {
      const statusCode = error instanceof TokenRequestError ? error.statusCode : undefined;
      this.logger.error('Azure B2C token acquisition failed', { statusCode });
      throw error;
    }
  }
}
