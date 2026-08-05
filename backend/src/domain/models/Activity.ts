export const ACTIVITY_NAME_MAX_LENGTH = 100;

export interface ActivityProps {
  id?: number;
  name: string;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
}

export class Activity {
  readonly id?: number;
  readonly name: string;
  readonly active: boolean;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
  readonly createdBy?: string | null;

  constructor(props: ActivityProps) {
    Activity.validateName(props.name);

    this.id = props.id;
    this.name = props.name;
    this.active = props.active ?? true;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.createdBy = props.createdBy;
  }

  static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Activity name is required');
    }
    if (name.length > ACTIVITY_NAME_MAX_LENGTH) {
      throw new Error(`Activity name must be at most ${ACTIVITY_NAME_MAX_LENGTH} characters`);
    }
  }
}
