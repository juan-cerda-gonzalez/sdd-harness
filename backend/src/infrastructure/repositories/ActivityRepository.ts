import { Prisma, PrismaClient } from '@prisma/client';
import { Activity } from '../../domain/models/Activity';
import { ConflictError } from '../../domain/errors';
import {
  FindManyParams,
  FindManyResult,
  IActivityRepository,
  UpdateActivityData
} from '../../domain/repositories/IActivityRepository';

const UNIQUE_CONSTRAINT_VIOLATION_CODE = 'P2002';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === UNIQUE_CONSTRAINT_VIOLATION_CODE
  );
}

type ActivityRecord = {
  id: number;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
};

function toDomain(record: ActivityRecord): Activity {
  return new Activity({
    id: record.id,
    name: record.name,
    active: record.active,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy
  });
}

function buildSearchWhere(search?: string): Prisma.ActivityWhereInput {
  if (!search || search.trim().length === 0) {
    return {};
  }
  return {
    name: {
      contains: search,
      mode: 'insensitive'
    }
  };
}

export class ActivityRepository implements IActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMany({ search, page, limit }: FindManyParams): Promise<FindManyResult> {
    const where = buildSearchWhere(search);

    const [records, total] = await Promise.all([
      this.prisma.activity.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' }
      }),
      this.prisma.activity.count({ where })
    ]);

    return { items: records.map(toDomain), total };
  }

  async findAllMatching(search?: string): Promise<Activity[]> {
    const where = buildSearchWhere(search);
    const records = await this.prisma.activity.findMany({
      where,
      orderBy: { id: 'asc' }
    });
    return records.map(toDomain);
  }

  async findById(id: number): Promise<Activity | null> {
    const record = await this.prisma.activity.findUnique({ where: { id } });
    return record ? toDomain(record) : null;
  }

  async findByNameCaseInsensitive(name: string, excludeId?: number): Promise<Activity | null> {
    const record = await this.prisma.activity.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId !== undefined ? { id: { not: excludeId } } : {})
      }
    });
    return record ? toDomain(record) : null;
  }

  async update(id: number, data: UpdateActivityData): Promise<Activity> {
    try {
      const record = await this.prisma.activity.update({
        where: { id },
        data: { name: data.name }
      });
      return toDomain(record);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictError(`An activity named "${data.name}" already exists`);
      }
      throw error;
    }
  }

  async updateStatus(id: number, active: boolean): Promise<Activity> {
    const record = await this.prisma.activity.update({
      where: { id },
      data: { active }
    });
    return toDomain(record);
  }
}
