import { ACTIVITY_NAME_MAX_LENGTH } from '../domain/models/Activity';
import { ValidationError } from '../domain/errors';

export function validateActivityName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new ValidationError('name is required and must be a non-empty string');
  }

  const normalizedName = name.trim();

  if (normalizedName.length === 0) {
    throw new ValidationError('name is required and must be a non-empty string');
  }
  if (normalizedName.length > ACTIVITY_NAME_MAX_LENGTH) {
    throw new ValidationError(`name must be at most ${ACTIVITY_NAME_MAX_LENGTH} characters`);
  }
  return normalizedName;
}

export function validateActiveFlag(active: unknown): boolean {
  if (typeof active !== 'boolean') {
    throw new ValidationError('active is required and must be a boolean');
  }
  return active;
}
