import { getAzureB2CConfig } from '../../../infrastructure/config/azureB2CConfig';

describe('azureB2CConfig - getAzureB2CConfig', () => {
  const REQUIRED_VARS = [
    'AZURE_B2C_TOKEN_URL',
    'AZURE_B2C_CLIENT_ID',
    'AZURE_B2C_CLIENT_SECRET',
    'AZURE_B2C_SCOPE',
    'AZURE_B2C_RESOURCE'
  ];
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      AZURE_B2C_TOKEN_URL: 'https://example.com/token',
      AZURE_B2C_CLIENT_ID: 'client-id',
      AZURE_B2C_CLIENT_SECRET: 'client-secret',
      AZURE_B2C_SCOPE: 'scope-value',
      AZURE_B2C_RESOURCE: 'resource-value'
    };
    delete process.env.AZURE_B2C_TOKEN_CACHE_TTL_SECONDS;
    delete process.env.AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('should_return_config_when_all_required_variables_are_set', () => {
    it('should return config with default TTL and timeout', () => {
      // Act
      const config = getAzureB2CConfig();

      // Assert
      expect(config).toEqual({
        tokenUrl: 'https://example.com/token',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        scope: 'scope-value',
        resource: 'resource-value',
        tokenCacheTtlSeconds: 600,
        tokenRequestTimeoutMs: 5000
      });
    });
  });

  describe('should_use_configured_ttl_and_timeout_when_provided', () => {
    it('should override the defaults', () => {
      // Arrange
      process.env.AZURE_B2C_TOKEN_CACHE_TTL_SECONDS = '120';
      process.env.AZURE_B2C_TOKEN_REQUEST_TIMEOUT_MS = '2000';

      // Act
      const config = getAzureB2CConfig();

      // Assert
      expect(config.tokenCacheTtlSeconds).toBe(120);
      expect(config.tokenRequestTimeoutMs).toBe(2000);
    });
  });

  describe.each(REQUIRED_VARS)('should_fail_startup_when_%s_is_missing', (varName) => {
    it(`should throw a descriptive error naming ${varName}`, () => {
      // Arrange
      delete process.env[varName];

      // Act & Assert
      expect(() => getAzureB2CConfig()).toThrow(`Missing required environment variable: ${varName}`);
    });
  });
});
