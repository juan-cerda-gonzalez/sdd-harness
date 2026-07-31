import axios from 'axios';
import { fetchAzureB2CToken, TokenRequestError } from '../../../infrastructure/auth/azureB2CTokenClient';
import { AzureB2CConfig } from '../../../infrastructure/config/azureB2CConfig';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    ...actual,
    post: jest.fn()
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;

function buildConfig(overrides: Partial<AzureB2CConfig> = {}): AzureB2CConfig {
  return {
    tokenUrl: 'https://example.com/token',
    clientId: 'client-id',
    clientSecret: 'client-secret',
    scope: 'scope-value',
    resource: 'resource-value',
    tokenCacheTtlSeconds: 600,
    tokenRequestTimeoutMs: 5000,
    ...overrides
  };
}

function networkError() {
  return { isAxiosError: true, response: undefined };
}

function httpError(status: number) {
  return { isAxiosError: true, response: { status } };
}

describe('azureB2CTokenClient - fetchAzureB2CToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('should_include_scope_and_resource_in_token_request', () => {
    it('should send scope and resource as part of the payload', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ status: 200, data: { access_token: 'token-abc' } });
      const config = buildConfig();

      // Act
      await fetchAzureB2CToken(config);

      // Assert
      const [url, body] = mockedAxios.post.mock.calls[0];
      expect(url).toBe(config.tokenUrl);
      expect(body).toContain('scope=scope-value');
      expect(body).toContain('resource=resource-value');
    });
  });

  describe('should_send_configured_scope_and_resource_values_without_modification', () => {
    it('should forward grant_type, client_id, client_secret, scope, and resource unchanged', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ status: 200, data: { access_token: 'token-abc' } });
      const config = buildConfig({ scope: 'custom-scope', resource: 'custom-resource' });

      // Act
      await fetchAzureB2CToken(config);

      // Assert
      const [, body, options] = mockedAxios.post.mock.calls[0];
      const params = new URLSearchParams(body as string);
      expect(params.get('grant_type')).toBe('client_credentials');
      expect(params.get('client_id')).toBe('client-id');
      expect(params.get('client_secret')).toBe('client-secret');
      expect(params.get('scope')).toBe('custom-scope');
      expect(params.get('resource')).toBe('custom-resource');
      expect((options as { headers: Record<string, string> }).headers['Content-Type']).toBe(
        'application/x-www-form-urlencoded'
      );
    });
  });

  describe('should_return_access_token_when_response_is_successful', () => {
    it('should extract the access_token from the response', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ status: 200, data: { access_token: 'token-abc' } });

      // Act
      const token = await fetchAzureB2CToken(buildConfig());

      // Assert
      expect(token).toBe('token-abc');
    });
  });

  describe('should_throw_error_when_access_token_is_missing_in_200_response', () => {
    it('should throw a TokenRequestError without retrying', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      // Act & Assert
      await expect(fetchAzureB2CToken(buildConfig())).rejects.toThrow(TokenRequestError);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('should preserve the upstream HTTP status for diagnostics', async () => {
      // Arrange
      mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

      // Act & Assert
      const error = await fetchAzureB2CToken(buildConfig()).catch((e) => e);
      expect(error).toBeInstanceOf(TokenRequestError);
      expect((error as TokenRequestError).statusCode).toBe(200);
    });
  });

  describe('should_not_retry_when_token_endpoint_returns_error_status', () => {
    it('should throw immediately on a 400/401/500 response without retrying', async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue(httpError(401));

      // Act & Assert
      const error = await fetchAzureB2CToken(buildConfig()).catch((e) => e);
      expect(error).toBeInstanceOf(TokenRequestError);
      expect((error as TokenRequestError).statusCode).toBe(401);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('should_retry_bounded_times_when_transient_network_error_occurs', () => {
    it('should retry up to the configured bound and eventually throw', async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue(networkError());

      // Act & Assert
      await expect(fetchAzureB2CToken(buildConfig())).rejects.toThrow(TokenRequestError);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);
    });

    it('should succeed if a retry after a transient error returns a token', async () => {
      // Arrange
      mockedAxios.post
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce({ status: 200, data: { access_token: 'token-after-retry' } });

      // Act
      const token = await fetchAzureB2CToken(buildConfig());

      // Assert
      expect(token).toBe('token-after-retry');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('should_apply_bounded_backoff_delay_between_transient_retries', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should wait with exponential backoff before each retry and stop after the bound', async () => {
      // Arrange
      mockedAxios.post.mockRejectedValue(networkError());

      // Act
      const resultPromise = fetchAzureB2CToken(buildConfig());
      const assertion = expect(resultPromise).rejects.toThrow(TokenRequestError);

      // Assert: no retry has happened yet until the first backoff delay elapses.
      await Promise.resolve();
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(200);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(400);
      expect(mockedAxios.post).toHaveBeenCalledTimes(3);

      await assertion;
    });

    it('should not delay before returning once a retry succeeds', async () => {
      // Arrange
      mockedAxios.post
        .mockRejectedValueOnce(networkError())
        .mockResolvedValueOnce({ status: 200, data: { access_token: 'token-after-backoff' } });

      // Act
      const resultPromise = fetchAzureB2CToken(buildConfig());
      await jest.advanceTimersByTimeAsync(200);
      const token = await resultPromise;

      // Assert
      expect(token).toBe('token-after-backoff');
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });
});
