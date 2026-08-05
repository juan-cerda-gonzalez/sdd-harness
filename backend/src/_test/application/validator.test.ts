import { validateActivityName, validateActiveFlag } from '../../application/validator';
import { ACTIVITY_NAME_MAX_LENGTH } from '../../domain/models/Activity';
import { ValidationError } from '../../domain/errors';

describe('validator - validateActivityName', () => {
  describe('should_return_name_when_valid', () => {
    it('should return the name unchanged when valid', () => {
      // Act
      const result = validateActivityName('Ventas');

      // Assert
      expect(result).toBe('Ventas');
    });

    it('should accept a name exactly at the maximum length', () => {
      // Arrange
      const name = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH);

      // Act
      const result = validateActivityName(name);

      // Assert
      expect(result).toBe(name);
    });
  });

  describe('should_throw_ValidationError_when_invalid', () => {
    it('should throw when name is not a string', () => {
      // Act & Assert
      expect(() => validateActivityName(123)).toThrow(ValidationError);
    });

    it('should throw when name is undefined', () => {
      // Act & Assert
      expect(() => validateActivityName(undefined)).toThrow(ValidationError);
    });

    it('should throw when name is an empty string', () => {
      // Act & Assert
      expect(() => validateActivityName('')).toThrow(ValidationError);
    });

    it('should throw when name exceeds the maximum length', () => {
      // Arrange
      const name = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH + 1);

      // Act & Assert
      expect(() => validateActivityName(name)).toThrow(
        `name must be at most ${ACTIVITY_NAME_MAX_LENGTH} characters`
      );
    });
  });
});

describe('validator - validateActiveFlag', () => {
  describe('should_return_value_when_boolean', () => {
    it('should return true unchanged', () => {
      expect(validateActiveFlag(true)).toBe(true);
    });

    it('should return false unchanged', () => {
      expect(validateActiveFlag(false)).toBe(false);
    });
  });

  describe('should_throw_ValidationError_when_not_boolean', () => {
    it('should throw when active is a string', () => {
      expect(() => validateActiveFlag('true')).toThrow(ValidationError);
    });

    it('should throw when active is undefined', () => {
      expect(() => validateActiveFlag(undefined)).toThrow(ValidationError);
    });
  });
});
