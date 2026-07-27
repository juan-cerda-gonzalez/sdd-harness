import { TokenCache } from '../../../infrastructure/auth/tokenCache';

describe('TokenCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('should_return_undefined_when_cache_is_empty', () => {
    it('should return undefined for an unknown key', () => {
      // Arrange
      const cache = new TokenCache();

      // Act
      const result = cache.get('missing-key');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('should_return_cached_token_when_cache_is_valid', () => {
    it('should return the stored token before TTL elapses', () => {
      // Arrange
      const cache = new TokenCache();
      cache.set('key', 'token-value', 600);

      // Act
      const result = cache.get('key');

      // Assert
      expect(result).toBe('token-value');
    });
  });

  describe('should_expire_token_when_ttl_has_elapsed', () => {
    it('should return undefined after the TTL window passes', () => {
      // Arrange
      const cache = new TokenCache();
      cache.set('key', 'token-value', 10);

      // Act
      jest.advanceTimersByTime(10_001);
      const result = cache.get('key');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('should_invalidate_cached_token_when_invalidate_is_called', () => {
    it('should remove the entry so subsequent get returns undefined', () => {
      // Arrange
      const cache = new TokenCache();
      cache.set('key', 'token-value', 600);

      // Act
      cache.invalidate('key');

      // Assert
      expect(cache.get('key')).toBeUndefined();
    });
  });

  describe('should_return_undefined_remaining_ttl_when_cache_is_empty', () => {
    it('should return undefined for an unknown key', () => {
      // Arrange
      const cache = new TokenCache();

      // Act
      const result = cache.getRemainingTtlSeconds('missing-key');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('should_return_remaining_ttl_when_cache_is_valid', () => {
    it('should return the remaining seconds before expiry', () => {
      // Arrange
      const cache = new TokenCache();
      cache.set('key', 'token-value', 100);

      // Act
      jest.advanceTimersByTime(40_000);
      const result = cache.getRemainingTtlSeconds('key');

      // Assert
      expect(result).toBe(60);
    });
  });

  describe('should_return_undefined_remaining_ttl_when_entry_has_expired', () => {
    it('should return undefined and clear the expired entry', () => {
      // Arrange
      const cache = new TokenCache();
      cache.set('key', 'token-value', 10);

      // Act
      jest.advanceTimersByTime(10_001);
      const result = cache.getRemainingTtlSeconds('key');

      // Assert
      expect(result).toBeUndefined();
    });
  });
});
