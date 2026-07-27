import { Logger } from '../../infrastructure/logger';

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('should_write_structured_info_log_when_info_is_called', () => {
    it('should include level, message, and metadata', () => {
      // Act
      new Logger().info('token acquired', { cacheState: 'hit' });

      // Assert
      const [line] = consoleLogSpy.mock.calls[0];
      expect(JSON.parse(line)).toEqual({ level: 'info', message: 'token acquired', cacheState: 'hit' });
    });
  });

  describe('should_write_structured_warn_log_when_warn_is_called', () => {
    it('should include level and message', () => {
      // Act
      new Logger().warn('unexpected state');

      // Assert
      const [line] = consoleWarnSpy.mock.calls[0];
      expect(JSON.parse(line)).toEqual({ level: 'warn', message: 'unexpected state' });
    });
  });

  describe('should_write_structured_error_log_when_error_is_called', () => {
    it('should include level, message, and metadata without leaking secrets', () => {
      // Act
      new Logger().error('token acquisition failed', { statusCode: 401 });

      // Assert
      const [line] = consoleErrorSpy.mock.calls[0];
      expect(JSON.parse(line)).toEqual({ level: 'error', message: 'token acquisition failed', statusCode: 401 });
    });
  });
});
