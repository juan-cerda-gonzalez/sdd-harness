import { TokenService } from '../../../application/services/tokenService';
import { TokenCache } from '../../../infrastructure/auth/tokenCache';
import { Logger } from '../../../infrastructure/logger';
import { fetchAzureB2CToken, TokenRequestError } from '../../../infrastructure/auth/azureB2CTokenClient';
import { AzureB2CConfig } from '../../../infrastructure/config/azureB2CConfig';

jest.mock('../../../infrastructure/auth/azureB2CTokenClient', () => {
  const actual = jest.requireActual('../../../infrastructure/auth/azureB2CTokenClient');
  return {
    ...actual,
    fetchAzureB2CToken: jest.fn()
  };
});

const mockedFetchAzureB2CToken = fetchAzureB2CToken as jest.MockedFunction<typeof fetchAzureB2CToken>;

const testConfig: AzureB2CConfig = {
  tokenUrl: 'https://example.com/token',
  clientId: 'client-id',
  clientSecret: 'super-secret-value',
  scope: 'scope-value',
  resource: 'resource-value',
  tokenCacheTtlSeconds: 600,
  tokenRequestTimeoutMs: 5000
};

function buildService() {
  const cache = new TokenCache();
  const logger = new Logger();
  jest.spyOn(logger, 'info').mockImplementation(() => undefined);
  jest.spyOn(logger, 'error').mockImplementation(() => undefined);
  const service = new TokenService(cache, logger, () => testConfig);
  return { service, cache, logger };
}

describe('TokenService - getAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should_return_cached_token_when_cache_is_valid', () => {
    it('should not call the Azure B2C client when a valid cached token exists', async () => {
      // Arrange
      const { service, cache } = buildService();
      cache.set('azure-b2c-access-token', 'cached-token', 600);

      // Act
      const token = await service.getAccessToken();

      // Assert
      expect(token).toBe('cached-token');
      expect(mockedFetchAzureB2CToken).not.toHaveBeenCalled();
    });
  });

  describe('should_request_new_token_when_cache_is_empty', () => {
    it('should call the Azure B2C client and cache the result', async () => {
      // Arrange
      const { service, cache } = buildService();
      mockedFetchAzureB2CToken.mockResolvedValue('fresh-token');

      // Act
      const token = await service.getAccessToken();

      // Assert
      expect(token).toBe('fresh-token');
      expect(mockedFetchAzureB2CToken).toHaveBeenCalledTimes(1);
      expect(cache.get('azure-b2c-access-token')).toBe('fresh-token');
    });
  });

  describe('should_request_new_token_when_cache_has_expired', () => {
    it('should call the Azure B2C client again after the cached entry expires', async () => {
      // Arrange
      const { service, cache } = buildService();
      cache.set('azure-b2c-access-token', 'expired-token', -1);
      mockedFetchAzureB2CToken.mockResolvedValue('renewed-token');

      // Act
      const token = await service.getAccessToken();

      // Assert
      expect(token).toBe('renewed-token');
      expect(mockedFetchAzureB2CToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('should_not_cache_response_when_token_endpoint_returns_error_status', () => {
    it('should propagate the error and leave the cache empty', async () => {
      // Arrange
      const { service, cache } = buildService();
      mockedFetchAzureB2CToken.mockRejectedValue(new TokenRequestError('Azure B2C token request failed', 401));

      // Act & Assert
      await expect(service.getAccessToken()).rejects.toThrow(TokenRequestError);
      expect(cache.get('azure-b2c-access-token')).toBeUndefined();
    });
  });

  describe('should_throw_error_when_access_token_is_missing_in_200_response', () => {
    it('should propagate the error without caching', async () => {
      // Arrange
      const { service, cache } = buildService();
      mockedFetchAzureB2CToken.mockRejectedValue(
        new TokenRequestError('Azure B2C token response did not contain an access_token', 200)
      );

      // Act & Assert
      await expect(service.getAccessToken()).rejects.toThrow(TokenRequestError);
      expect(cache.get('azure-b2c-access-token')).toBeUndefined();
    });
  });

  describe('should_trigger_only_one_upstream_request_when_multiple_concurrent_calls_occur_during_cache_miss', () => {
    it('should share a single in-flight request across concurrent callers', async () => {
      // Arrange
      const { service } = buildService();
      let resolveToken: (token: string) => void = () => undefined;
      mockedFetchAzureB2CToken.mockImplementation(
        () => new Promise<string>((resolve) => { resolveToken = resolve; })
      );

      // Act
      const call1 = service.getAccessToken();
      const call2 = service.getAccessToken();
      const call3 = service.getAccessToken();
      resolveToken('shared-token');
      const [token1, token2, token3] = await Promise.all([call1, call2, call3]);

      // Assert
      expect(token1).toBe('shared-token');
      expect(token2).toBe('shared-token');
      expect(token3).toBe('shared-token');
      expect(mockedFetchAzureB2CToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('should_use_getAzureB2CConfig_by_default_when_no_config_loader_is_provided', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        AZURE_B2C_TOKEN_URL: 'https://example.com/token',
        AZURE_B2C_CLIENT_ID: 'client-id',
        AZURE_B2C_CLIENT_SECRET: 'client-secret',
        AZURE_B2C_SCOPE: 'scope-value',
        AZURE_B2C_RESOURCE: 'resource-value'
      };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should read configuration from environment variables', async () => {
      // Arrange
      const cache = new TokenCache();
      const logger = new Logger();
      jest.spyOn(logger, 'info').mockImplementation(() => undefined);
      const service = new TokenService(cache, logger);
      mockedFetchAzureB2CToken.mockResolvedValue('env-based-token');

      // Act
      const token = await service.getAccessToken();

      // Assert
      expect(token).toBe('env-based-token');
    });
  });

  describe('should_log_undefined_status_code_when_error_is_not_a_TokenRequestError', () => {
    it('should propagate a non-TokenRequestError without a status code', async () => {
      // Arrange
      const { service, logger } = buildService();
      mockedFetchAzureB2CToken.mockRejectedValue(new Error('unexpected failure'));

      // Act & Assert
      await expect(service.getAccessToken()).rejects.toThrow('unexpected failure');
      expect(logger.error).toHaveBeenCalledWith('Azure B2C token acquisition failed', { statusCode: undefined });
    });
  });

  describe('should_log_and_propagate_configuration_errors_raised_while_loading_config', () => {
    it('should log the acquisition failure when loadConfig throws before any upstream call is made', async () => {
      // Arrange
      const cache = new TokenCache();
      const logger = new Logger();
      jest.spyOn(logger, 'info').mockImplementation(() => undefined);
      jest.spyOn(logger, 'error').mockImplementation(() => undefined);
      const loadConfig = jest.fn(() => {
        throw new Error('Environment variable AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS must be a positive integer, got: 0');
      });
      const service = new TokenService(cache, logger, loadConfig);

      // Act & Assert
      await expect(service.getAccessToken()).rejects.toThrow(
        'Environment variable AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS must be a positive integer, got: 0'
      );
      expect(logger.error).toHaveBeenCalledWith('Azure B2C token acquisition failed', { statusCode: undefined });
      expect(mockedFetchAzureB2CToken).not.toHaveBeenCalled();
    });
  });

  describe('should_not_log_token_secret_scope_or_resource_values', () => {
    it('should never include the raw token or secret in logger calls', async () => {
      // Arrange
      const { service, logger } = buildService();
      mockedFetchAzureB2CToken.mockResolvedValue('super-secret-token-value');

      // Act
      await service.getAccessToken();

      // Assert
      const allLogCalls = [
        ...(logger.info as jest.Mock).mock.calls,
        ...(logger.error as jest.Mock).mock.calls
      ];
      const serializedCalls = JSON.stringify(allLogCalls);
      expect(serializedCalls).not.toContain('super-secret-token-value');
      expect(serializedCalls).not.toContain(testConfig.clientSecret);
    });
  });
});

describe('TokenService - getStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should_return_cached_false_when_token_status_is_requested_and_cache_is_empty', () => {
    it('should report cached: false', () => {
      // Arrange
      const { service } = buildService();

      // Act
      const status = service.getStatus();

      // Assert
      expect(status).toEqual({ cached: false });
    });
  });

  describe('should_return_cached_true_when_token_status_is_requested_and_cache_is_valid', () => {
    it('should report cached: true with remaining seconds', async () => {
      // Arrange
      const { service } = buildService();
      mockedFetchAzureB2CToken.mockResolvedValue('token-value');
      await service.getAccessToken();

      // Act
      const status = service.getStatus();

      // Assert
      expect(status.cached).toBe(true);
      expect(status.expiresInSeconds).toBeGreaterThan(0);
    });
  });

  describe('should_not_expose_token_or_secret_in_token_status_response_body', () => {
    it('should never include token, secret, scope, or resource fields', async () => {
      // Arrange
      const { service } = buildService();
      mockedFetchAzureB2CToken.mockResolvedValue('token-value');
      await service.getAccessToken();

      // Act
      const status = service.getStatus();

      // Assert
      expect(Object.keys(status).sort()).toEqual(['cached', 'expiresInSeconds']);
      expect(JSON.stringify(status)).not.toContain('token-value');
    });
  });
});

describe('TokenService - forceRefreshAccessToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should_force_refresh_and_cache_new_token_when_forceRefresh_query_param_is_true', () => {
    it('should bypass a valid cached token and fetch a new one', async () => {
      // Arrange
      const { service, cache } = buildService();
      cache.set('azure-b2c-access-token', 'stale-token', 600);
      mockedFetchAzureB2CToken.mockResolvedValue('forced-fresh-token');

      // Act
      const token = await service.forceRefreshAccessToken();

      // Assert
      expect(token).toBe('forced-fresh-token');
      expect(mockedFetchAzureB2CToken).toHaveBeenCalledTimes(1);
      expect(cache.get('azure-b2c-access-token')).toBe('forced-fresh-token');
    });
  });

  describe('should_propagate_error_when_forced_refresh_acquisition_fails', () => {
    it('should not cache a value and should propagate the error', async () => {
      // Arrange
      const { service, cache } = buildService();
      cache.set('azure-b2c-access-token', 'stale-token', 600);
      mockedFetchAzureB2CToken.mockRejectedValue(new TokenRequestError('failed', 401));

      // Act & Assert
      await expect(service.forceRefreshAccessToken()).rejects.toThrow(TokenRequestError);
      expect(cache.get('azure-b2c-access-token')).toBeUndefined();
    });
  });
});
