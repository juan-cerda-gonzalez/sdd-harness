import { ACTIVITY_NAME_MAX_LENGTH } from '../domain/models/Activity';
import { ValidationError } from '../domain/errors';

export function validateActivityName(name: unknown): string {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('name is required and must be a non-empty string');
  }
  if (name.length > ACTIVITY_NAME_MAX_LENGTH) {
    throw new ValidationError(`name must be at most ${ACTIVITY_NAME_MAX_LENGTH} characters`);
  }
  return name;
}

export function validateActiveFlag(active: unknown): boolean {
  if (typeof active !== 'boolean') {
    throw new ValidationError('active is required and must be a boolean');
  }
  return active;
}
