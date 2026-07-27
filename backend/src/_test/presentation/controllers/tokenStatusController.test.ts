import express from 'express';
import request from 'supertest';
import { createTokenStatusHandler } from '../../../presentation/controllers/tokenStatusController';
import { createTokenStatusRouter, areDiagnosticsEnabled } from '../../../presentation/routes/tokenStatusRoutes';
import { TokenService, TokenStatus } from '../../../application/services/tokenService';

function buildApp(tokenService: TokenService) {
  const app = express();
  app.get('/internal/auth/token-status', createTokenStatusHandler(tokenService));
  return app;
}

function fakeTokenService(overrides: Partial<TokenService> = {}): TokenService {
  return {
    getAccessToken: jest.fn(),
    forceRefreshAccessToken: jest.fn(),
    getStatus: jest.fn(),
    ...overrides
  } as unknown as TokenService;
}

describe('tokenStatusController - GET /internal/auth/token-status', () => {
  describe('should_return_cached_false_when_token_status_is_requested_and_cache_is_empty', () => {
    it('should respond 200 with cached: false and never call forceRefreshAccessToken', async () => {
      // Arrange
      const status: TokenStatus = { cached: false };
      const tokenService = fakeTokenService({ getStatus: jest.fn().mockReturnValue(status) });
      const app = buildApp(tokenService);

      // Act
      const response = await request(app).get('/internal/auth/token-status');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ cached: false });
      expect(tokenService.forceRefreshAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('should_return_cached_true_when_token_status_is_requested_and_cache_is_valid', () => {
    it('should respond 200 with cached: true and expiresInSeconds', async () => {
      // Arrange
      const status: TokenStatus = { cached: true, expiresInSeconds: 480 };
      const tokenService = fakeTokenService({ getStatus: jest.fn().mockReturnValue(status) });
      const app = buildApp(tokenService);

      // Act
      const response = await request(app).get('/internal/auth/token-status');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ cached: true, expiresInSeconds: 480 });
    });
  });

  describe('should_force_refresh_and_cache_new_token_when_forceRefresh_query_param_is_true', () => {
    it('should call forceRefreshAccessToken and return the resulting status', async () => {
      // Arrange
      const tokenService = fakeTokenService({
        forceRefreshAccessToken: jest.fn().mockResolvedValue('fresh-token'),
        getStatus: jest.fn().mockReturnValue({ cached: true, expiresInSeconds: 600 })
      });
      const app = buildApp(tokenService);

      // Act
      const response = await request(app).get('/internal/auth/token-status?forceRefresh=true');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ cached: true, expiresInSeconds: 600 });
      expect(tokenService.forceRefreshAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('should_not_expose_token_or_secret_in_token_status_response_body', () => {
    it('should never include a token or secret field in the response', async () => {
      // Arrange
      const tokenService = fakeTokenService({
        forceRefreshAccessToken: jest.fn().mockResolvedValue('super-secret-token-value'),
        getStatus: jest.fn().mockReturnValue({ cached: true, expiresInSeconds: 600 })
      });
      const app = buildApp(tokenService);

      // Act
      const response = await request(app).get('/internal/auth/token-status?forceRefresh=true');

      // Assert
      expect(JSON.stringify(response.body)).not.toContain('super-secret-token-value');
      expect(Object.keys(response.body).sort()).toEqual(['cached', 'expiresInSeconds']);
    });
  });

  describe('should_map_forced_refresh_failure_to_error_response_without_leaking_details', () => {
    it('should respond 502 without the token, secret, or raw upstream body', async () => {
      // Arrange
      const tokenService = fakeTokenService({
        forceRefreshAccessToken: jest.fn().mockRejectedValue(new Error('Azure B2C token request failed'))
      });
      const app = buildApp(tokenService);

      // Act
      const response = await request(app).get('/internal/auth/token-status?forceRefresh=true');

      // Assert
      expect(response.status).toBe(502);
      expect(response.body).toEqual({ error: 'Failed to acquire Azure B2C access token' });
    });
  });
});

describe('tokenStatusRoutes - areDiagnosticsEnabled', () => {
  describe('should_enable_diagnostics_when_node_env_is_not_production', () => {
    it('should return true for a non-production NODE_ENV', () => {
      // Act & Assert
      expect(areDiagnosticsEnabled({ NODE_ENV: 'development' })).toBe(true);
      expect(areDiagnosticsEnabled({ NODE_ENV: 'test' })).toBe(true);
      expect(areDiagnosticsEnabled({})).toBe(true);
    });
  });

  describe('should_not_register_token_status_route_when_node_env_is_production', () => {
    it('should return false for NODE_ENV=production without an explicit override', () => {
      // Act & Assert
      expect(areDiagnosticsEnabled({ NODE_ENV: 'production' })).toBe(false);
    });

    it('should not mount the route on the express app, resulting in a 404', async () => {
      // Arrange
      const tokenService = fakeTokenService({ getStatus: jest.fn().mockReturnValue({ cached: false }) });
      const app = express();
      if (areDiagnosticsEnabled({ NODE_ENV: 'production' })) {
        app.use(createTokenStatusRouter(tokenService));
      }

      // Act
      const response = await request(app).get('/internal/auth/token-status');

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('should_enable_diagnostics_when_explicit_flag_overrides_production', () => {
    it('should return true when ENABLE_DIAGNOSTICS=true even in production', () => {
      // Act & Assert
      expect(areDiagnosticsEnabled({ NODE_ENV: 'production', ENABLE_DIAGNOSTICS: 'true' })).toBe(true);
    });

    it('should ignore a non-"true" ENABLE_DIAGNOSTICS value and stay disabled in production', () => {
      // Act & Assert
      expect(areDiagnosticsEnabled({ NODE_ENV: 'production', ENABLE_DIAGNOSTICS: 'false' })).toBe(false);
    });
  });

  describe('should_default_to_process_env_when_no_env_argument_is_provided', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should read NODE_ENV from process.env by default', () => {
      // Arrange
      process.env = { ...originalEnv, NODE_ENV: 'production' };

      // Act & Assert
      expect(areDiagnosticsEnabled()).toBe(false);
    });
  });
});

describe('tokenStatusRoutes - createTokenStatusRouter', () => {
  describe('should_register_get_token_status_route', () => {
    it('should respond when mounted on an express app', async () => {
      // Arrange
      const tokenService = fakeTokenService({ getStatus: jest.fn().mockReturnValue({ cached: false }) });
      const app = express();
      app.use(createTokenStatusRouter(tokenService));

      // Act
      const response = await request(app).get('/internal/auth/token-status');

      // Assert
      expect(response.status).toBe(200);
    });
  });
});
