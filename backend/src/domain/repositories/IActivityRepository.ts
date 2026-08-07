import { Activity } from '../models/Activity';

export interface FindManyParams {
  search?: string;
  page: number;
  limit: number;
}

export interface FindManyResult {
  items: Activity[];
  total: number;
}

export interface CreateActivityData {
  name: string;
  createdBy?: string | null;
}

export interface UpdateActivityData {
  name: string;
}

export interface IActivityRepository {
  findMany(params: FindManyParams): Promise<FindManyResult>;
  findAllMatching(search?: string): Promise<Activity[]>;
  findById(id: number): Promise<Activity | null>;
  findByNameCaseInsensitive(name: string, excludeId?: number): Promise<Activity | null>;
  create(data: CreateActivityData): Promise<Activity>;
  update(id: number, data: UpdateActivityData): Promise<Activity>;
  updateStatus(id: number, active: boolean): Promise<Activity>;
}
