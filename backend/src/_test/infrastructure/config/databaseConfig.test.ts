import { loadDatabaseConfig } from '../../../infrastructure/config/databaseConfig';

const validUrl = 'postgresql://user:pass@host:5432/postgres';

describe('databaseConfig - loadDatabaseConfig', () => {
  describe('should_load_config_when_both_urls_are_valid', () => {
    it('should return the parsed config', () => {
      // Arrange
      const env = { DATABASE_URL: validUrl, DIRECT_URL: validUrl } as NodeJS.ProcessEnv;

      // Act
      const config = loadDatabaseConfig(env);

      // Assert
      expect(config).toEqual({ databaseUrl: validUrl, directUrl: validUrl });
    });
  });

  describe('should_throw_when_a_value_is_missing', () => {
    it('should throw when DATABASE_URL is missing', () => {
      // Arrange
      const env = { DIRECT_URL: validUrl } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadDatabaseConfig(env)).toThrow('Missing required environment variable: DATABASE_URL');
    });

    it('should throw when DIRECT_URL is missing', () => {
      // Arrange
      const env = { DATABASE_URL: validUrl } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadDatabaseConfig(env)).toThrow('Missing required environment variable: DIRECT_URL');
    });

    it('should throw when DATABASE_URL is an empty string', () => {
      // Arrange
      const env = { DATABASE_URL: '', DIRECT_URL: validUrl } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadDatabaseConfig(env)).toThrow('Missing required environment variable: DATABASE_URL');
    });

    it('should throw when DATABASE_URL is only whitespace', () => {
      // Arrange
      const env = { DATABASE_URL: '   ', DIRECT_URL: validUrl } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadDatabaseConfig(env)).toThrow('Missing required environment variable: DATABASE_URL');
    });
  });

  describe('should_throw_when_a_value_is_malformed', () => {
    it('should throw when DATABASE_URL does not use the postgresql:// scheme', () => {
      // Arrange
      const env = { DATABASE_URL: 'mysql://user:pass@host:3306/db', DIRECT_URL: validUrl } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadDatabaseConfig(env)).toThrow('Invalid DATABASE_URL: must be a valid postgresql:// connection string');
    });

    it('should throw when DIRECT_URL does not use the postgresql:// scheme', () => {
      // Arrange
      const env = { DATABASE_URL: validUrl, DIRECT_URL: 'not-a-url' } as NodeJS.ProcessEnv;

      // Act & Assert
      expect(() => loadDatabaseConfig(env)).toThrow('Invalid DIRECT_URL: must be a valid postgresql:// connection string');
    });
  });
});
