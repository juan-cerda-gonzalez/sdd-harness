import ExcelJS from 'exceljs';
import { Stream } from 'stream';
import { Activity } from '../../domain/models/Activity';
import { ConflictError, NotFoundError } from '../../domain/errors';
import { IActivityRepository } from '../../domain/repositories/IActivityRepository';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 10;

export interface ListActivitiesParams {
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListActivitiesResult {
  items: Activity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function resolvePagination(page?: number, limit?: number): { page: number; limit: number } {
  const resolvedPage = page && page > 0 ? Math.floor(page) : DEFAULT_PAGE;
  const requestedLimit = limit && limit > 0 ? Math.floor(limit) : DEFAULT_LIMIT;
  const resolvedLimit = Math.min(requestedLimit, MAX_LIMIT);
  return { page: resolvedPage, limit: resolvedLimit };
}

export class ActivityService {
  constructor(private readonly repository: IActivityRepository) {}

  async list(params: ListActivitiesParams): Promise<ListActivitiesResult> {
    const { page, limit } = resolvePagination(params.page, params.limit);
    const { items, total } = await this.repository.findMany({ search: params.search, page, limit });
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return { items, total, page, limit, totalPages };
  }

  async create(name: string, createdBy?: string | null): Promise<Activity> {
    const existing = await this.repository.findByNameCaseInsensitive(name);
    if (existing) {
      throw new ConflictError(`An activity named "${name}" already exists`);
    }
    return this.repository.create({ name, createdBy });
  }

  async update(id: number, name: string): Promise<Activity> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Activity with id ${id} not found`);
    }
    const duplicate = await this.repository.findByNameCaseInsensitive(name, id);
    if (duplicate) {
      throw new ConflictError(`An activity named "${name}" already exists`);
    }
    return this.repository.update(id, { name });
  }

  async updateStatus(id: number, active: boolean): Promise<Activity> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundError(`Activity with id ${id} not found`);
    }
    return this.repository.updateStatus(id, active);
  }

  async exportToExcel(destination: Stream, search?: string): Promise<void> {
    const activities = await this.repository.findAllMatching(search);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: destination });
    const sheet = workbook.addWorksheet('Activities');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Name', key: 'name', width: 40 },
      { header: 'Active', key: 'active', width: 10 }
    ];

    for (const activity of activities) {
      sheet.addRow({ id: activity.id, name: activity.name, active: activity.active }).commit();
    }

    sheet.commit();
    await workbook.commit();
  }
}
