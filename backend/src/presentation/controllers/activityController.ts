import { Request, Response } from 'express';
import { ActivityService } from '../../application/services/activityService';
import { validateActiveFlag, validateActivityName } from '../../application/validator';
import { ConflictError, NotFoundError, ValidationError } from '../../domain/errors';

function handleError(res: Response, error: unknown): void {
  if (error instanceof ValidationError) {
    res.status(400).json({ success: false, error: { message: error.message, code: error.code } });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ success: false, error: { message: error.message, code: error.code } });
    return;
  }
  if (error instanceof ConflictError) {
    res.status(409).json({ success: false, error: { message: error.message, code: error.code } });
    return;
  }
  const message = error instanceof Error ? error.message : 'Unexpected error';
  res.status(500).json({ success: false, error: { message, code: 'INTERNAL_ERROR' } });
}

function parseId(rawId: string): number {
  const id = Number(rawId);
  if (!Number.isFinite(id) || !Number.isInteger(id)) {
    throw new ValidationError('id must be a valid integer');
  }
  return id;
}

export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const page = req.query.page !== undefined ? Number(req.query.page) : undefined;
      const limit = req.query.limit !== undefined ? Number(req.query.limit) : undefined;

      const result = await this.activityService.list({ search, page, limit });

      res.status(200).json({
        success: true,
        data: result.items,
        message: 'Activities retrieved successfully',
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      });
    } catch (error) {
      handleError(res, error);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseId(req.params.id);
      const name = validateActivityName(req.body?.name);
      const activity = await this.activityService.update(id, name);
      res.status(200).json({ success: true, data: activity, message: 'Activity updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseId(req.params.id);
      const active = validateActiveFlag(req.body?.active);
      const activity = await this.activityService.updateStatus(id, active);
      res.status(200).json({ success: true, data: activity, message: 'Activity status updated successfully' });
    } catch (error) {
      handleError(res, error);
    }
  };

  export = async (req: Request, res: Response): Promise<void> => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="activities.xlsx"');
      await this.activityService.exportToExcel(res, search);
    } catch (error) {
      if (res.headersSent) {
        res.end();
        return;
      }
      res.removeHeader('Content-Type');
      res.removeHeader('Content-Disposition');
      handleError(res, error);
    }
  };
}
