import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ITokenProvider } from '../domain/repositories/ITokenProvider';

declare module 'axios' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface AxiosRequestConfig {
    skipAuth?: boolean;
  }
}

/**
 * Injects the Bearer token into a request config, unless the config
 * explicitly opts out via `skipAuth: true`.
 */
export async function authorizeOutboundRequest(
  config: InternalAxiosRequestConfig,
  tokenProvider: ITokenProvider
): Promise<InternalAxiosRequestConfig> {
  if (config.skipAuth) {
    return config;
  }

  const token = await tokenProvider.getAccessToken();
  config.headers.set('Authorization', `Bearer ${token}`);
  return config;
}

/**
 * Attaches the Bearer token interceptor to an axios client.
 * Requests are authenticated by default; pass `skipAuth: true` on a request
 * config to declare an explicit, intentional exception.
 */
export function attachOutboundAuthInterceptor(
  client: AxiosInstance,
  tokenProvider: ITokenProvider
): AxiosInstance {
  client.interceptors.request.use((config: InternalAxiosRequestConfig) =>
    authorizeOutboundRequest(config, tokenProvider)
  );

  return client;
}

/** The microservice's shared outbound HTTP client; all outbound calls should use this instance. */
export function createOutboundHttpClient(tokenProvider: ITokenProvider): AxiosInstance {
  return attachOutboundAuthInterceptor(axios.create(), tokenProvider);
}

/** Explicit, declared exception for integrations that must not receive the Azure B2C token. */
export function createUnauthenticatedHttpClient(): AxiosInstance {
  return axios.create();
}
