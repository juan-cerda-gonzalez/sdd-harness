import { loadServerConfig } from '../../../infrastructure/config/serverConfig';

describe('serverConfig - loadServerConfig', () => {
  describe('should_use_default_port_when_missing', () => {
    it('should default to 3000 when PORT is not set', () => {
      // Arrange
      const env = {} as NodeJS.ProcessEnv;

      // Act
      const config = loadServerConfig(env);

      // Assert
      expect(config).toEqual({ port: 3000 });
    });

    it('should default to 3000 when PORT is an empty string', () => {
      // Arrange
      const env = { PORT: '' } as NodeJS.ProcessEnv;

      // Act
      const config = loadServerConfig(env);

      // Assert
      expect(config).toEqual({ port: 3000 });
    });

    it('should default to 3000 when PORT is only whitespace', () => {
      // Arrange
      const env = { PORT: '   ' } as NodeJS.ProcessEnv;

      // Act
      const config = loadServerConfig(env);

      // Assert
      expect(config).toEqual({ port: 3000 });
    });
  });

  describe('should_use_valid_override_when_provided', () => {
    it('should use the provided valid port', () => {
      // Arrange
      const env = { PORT: '4000' } as NodeJS.ProcessEnv;

      // Act
      const config = loadServerConfig(env);

      // Assert
      expect(config).toEqual({ port: 4000 });
    });

    it('should trim leading and trailing whitespace before parsing', () => {
      // Arrange
      const env = { PORT: '  4000  ' } as NodeJS.ProcessEnv;

      // Act
      const config = loadServerConfig(env);

      // Assert
      expect(config).toEqual({ port: 4000 });
    });
  });

  describe('should_fail_fast_when_explicitly_invalid', () => {
    it('should throw when PORT is non-numeric', () => {
      // Arrange
      const env = { PORT: 'abc' } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadServerConfig(env)).toThrow(
        'Invalid PORT: must be an integer between 1 and 65535'
      );
    });

    it('should throw when PORT is zero', () => {
      // Arrange
      const env = { PORT: '0' } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadServerConfig(env)).toThrow(
        'Invalid PORT: must be an integer between 1 and 65535'
      );
    });

    it('should throw when PORT is negative', () => {
      // Arrange
      const env = { PORT: '-1' } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadServerConfig(env)).toThrow(
        'Invalid PORT: must be an integer between 1 and 65535'
      );
    });

    it('should throw when PORT is above 65535', () => {
      // Arrange
      const env = { PORT: '70000' } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadServerConfig(env)).toThrow(
        'Invalid PORT: must be an integer between 1 and 65535'
      );
    });

    it('should throw when PORT is a decimal value', () => {
      // Arrange
      const env = { PORT: '3000.5' } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadServerConfig(env)).toThrow(
        'Invalid PORT: must be an integer between 1 and 65535'
      );
    });

    it('should throw when PORT is not finite', () => {
      // Arrange
      const env = { PORT: 'Infinity' } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadServerConfig(env)).toThrow(
        'Invalid PORT: must be an integer between 1 and 65535'
      );
    });
  });
});
