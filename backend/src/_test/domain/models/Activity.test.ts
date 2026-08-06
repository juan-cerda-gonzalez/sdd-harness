import { Activity, ACTIVITY_NAME_MAX_LENGTH } from '../../../domain/models/Activity';

describe('Activity - constructor', () => {
  describe('should_create_activity_when_valid_data_provided', () => {
    it('should create an activity with default active=true when active is not provided', () => {
      // Arrange
      const props = { name: 'Ventas' };

      // Act
      const activity = new Activity(props);

      // Assert
      expect(activity.name).toBe('Ventas');
      expect(activity.active).toBe(true);
    });

    it('should create an activity with the provided active value', () => {
      // Arrange
      const props = { name: 'Ventas', active: false };

      // Act
      const activity = new Activity(props);

      // Assert
      expect(activity.active).toBe(false);
    });

    it('should accept a name exactly at the maximum length boundary', () => {
      // Arrange
      const name = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH);

      // Act
      const activity = new Activity({ name });

      // Assert
      expect(activity.name).toBe(name);
    });

    it('should trim leading and trailing whitespace from the name', () => {
      // Act
      const activity = new Activity({ name: '  Ventas  ' });

      // Assert
      expect(activity.name).toBe('Ventas');
    });
  });

  describe('should_throw_when_name_is_invalid', () => {
    it('should throw when name is empty', () => {
      // Act & Assert
      expect(() => new Activity({ name: '' })).toThrow('Activity name is required');
    });

    it('should throw when name is only whitespace', () => {
      // Act & Assert
      expect(() => new Activity({ name: '   ' })).toThrow('Activity name is required');
    });

    it('should throw when name exceeds the maximum length', () => {
      // Arrange
      const name = 'a'.repeat(ACTIVITY_NAME_MAX_LENGTH + 1);

      // Act & Assert
      expect(() => new Activity({ name })).toThrow(
        `Activity name must be at most ${ACTIVITY_NAME_MAX_LENGTH} characters`
      );
    });
  });
});
