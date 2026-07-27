import { InternalAxiosRequestConfig } from 'axios';
import {
  authorizeOutboundRequest,
  attachOutboundAuthInterceptor,
  createOutboundHttpClient,
  createUnauthenticatedHttpClient
} from '../../middleware/outboundAuthInterceptor';
import { ITokenProvider } from '../../domain/repositories/ITokenProvider';

function buildConfig(overrides: Partial<InternalAxiosRequestConfig> = {}): InternalAxiosRequestConfig {
  return {
    headers: { set: jest.fn() },
    ...overrides
  } as unknown as InternalAxiosRequestConfig;
}

describe('outboundAuthInterceptor - authorizeOutboundRequest', () => {
  describe('should_include_authorization_header_by_default_for_a_new_integration_without_declared_exception', () => {
    it('should attach Authorization: Bearer <token> when the config has no skipAuth flag', async () => {
      // Arrange
      const tokenProvider: ITokenProvider = { getAccessToken: jest.fn().mockResolvedValue('token-abc') };
      const config = buildConfig();

      // Act
      const result = await authorizeOutboundRequest(config, tokenProvider);

      // Assert
      expect(result.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer token-abc');
    });
  });

  describe('should_include_authorization_header_when_calling_through_the_shared_outbound_client', () => {
    it('should call the token provider for every authorized request', async () => {
      // Arrange
      const getAccessToken = jest.fn().mockResolvedValue('token-xyz');
      const tokenProvider: ITokenProvider = { getAccessToken };
      const config = buildConfig();

      // Act
      await authorizeOutboundRequest(config, tokenProvider);

      // Assert
      expect(getAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('should_not_include_authorization_header_when_integration_declares_an_explicit_exception', () => {
    it('should skip token acquisition entirely when skipAuth is true', async () => {
      // Arrange
      const getAccessToken = jest.fn();
      const tokenProvider: ITokenProvider = { getAccessToken };
      const config = buildConfig({ skipAuth: true });

      // Act
      const result = await authorizeOutboundRequest(config, tokenProvider);

      // Assert
      expect(getAccessToken).not.toHaveBeenCalled();
      expect((result.headers as unknown as { set: jest.Mock }).set).not.toHaveBeenCalled();
    });
  });

  describe('should_not_send_request_when_token_acquisition_fails', () => {
    it('should reject and never set the Authorization header', async () => {
      // Arrange
      const tokenProvider: ITokenProvider = {
        getAccessToken: jest.fn().mockRejectedValue(new Error('token acquisition failed'))
      };
      const config = buildConfig();

      // Act & Assert
      await expect(authorizeOutboundRequest(config, tokenProvider)).rejects.toThrow('token acquisition failed');
      expect((config.headers as unknown as { set: jest.Mock }).set).not.toHaveBeenCalled();
    });
  });
});

describe('outboundAuthInterceptor - client factories', () => {
  describe('should_attach_interceptor_to_the_shared_outbound_client', () => {
    it('should register exactly one request interceptor', () => {
      // Arrange
      const tokenProvider: ITokenProvider = { getAccessToken: jest.fn() };

      // Act
      const client = createOutboundHttpClient(tokenProvider);

      // Assert
      expect((client.interceptors.request as unknown as { handlers: unknown[] }).handlers).toHaveLength(1);
    });
  });

  describe('should_not_attach_interceptor_to_the_unauthenticated_exception_client', () => {
    it('should register no request interceptors', () => {
      // Act
      const client = createUnauthenticatedHttpClient();

      // Assert
      expect((client.interceptors.request as unknown as { handlers: unknown[] }).handlers).toHaveLength(0);
    });
  });

  describe('should_invoke_authorizeOutboundRequest_through_the_registered_interceptor', () => {
    it('should attach the Authorization header when the registered handler runs', async () => {
      // Arrange
      const tokenProvider: ITokenProvider = { getAccessToken: jest.fn().mockResolvedValue('handler-token') };
      const client = createOutboundHttpClient(tokenProvider);
      const [handler] = (client.interceptors.request as unknown as {
        handlers: Array<{ fulfilled: (config: InternalAxiosRequestConfig) => Promise<InternalAxiosRequestConfig> }>;
      }).handlers;
      const config = buildConfig();

      // Act
      const result = await handler.fulfilled(config);

      // Assert
      expect(result.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer handler-token');
    });
  });

  describe('should_return_the_same_client_instance_from_attachOutboundAuthInterceptor', () => {
    it('should attach the interceptor in place and return the same client', () => {
      // Arrange
      const tokenProvider: ITokenProvider = { getAccessToken: jest.fn() };
      const client = createUnauthenticatedHttpClient();

      // Act
      const result = attachOutboundAuthInterceptor(client, tokenProvider);

      // Assert
      expect(result).toBe(client);
      expect((client.interceptors.request as unknown as { handlers: unknown[] }).handlers).toHaveLength(1);
    });
  });
});
