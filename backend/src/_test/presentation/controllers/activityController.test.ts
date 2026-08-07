import { Request, Response } from 'express';
import { ActivityController } from '../../../presentation/controllers/activityController';
import { ActivityService } from '../../../application/services/activityService';
import { Activity } from '../../../domain/models/Activity';
import { ConflictError, NotFoundError } from '../../../domain/errors';

function createMockService(): jest.Mocked<ActivityService> {
  return {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn(),
    exportToExcel: jest.fn()
  } as unknown as jest.Mocked<ActivityService>;
}

function createMockResponse(): jest.Mocked<Response> {
  const res: Partial<jest.Mocked<Response>> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    removeHeader: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
    headersSent: false
  };
  return res as jest.Mocked<Response>;
}

const sampleActivity = new Activity({ id: 1, name: 'Ventas', active: true });

describe('ActivityController', () => {
  let service: jest.Mocked<ActivityService>;
  let controller: ActivityController;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createMockService();
    controller = new ActivityController(service);
  });

  describe('list', () => {
    it('should return 200 with paginated data on success', async () => {
      // Arrange
      service.list.mockResolvedValue({ items: [sampleActivity], total: 1, page: 1, limit: 10, totalPages: 1 });
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.list(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: [sampleActivity] })
      );
    });

    it('should return 500 when the service throws an unexpected error', async () => {
      // Arrange
      service.list.mockRejectedValue(new Error('db down'));
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.list(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'db down', code: 'INTERNAL_ERROR' }
      });
    });

    it('should return 500 with a fallback message when a non-Error value is thrown', async () => {
      // Arrange
      service.list.mockRejectedValue('boom');
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.list(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'Unexpected error', code: 'INTERNAL_ERROR' }
      });
    });

    it('should forward search, page, and limit query parameters to the service', async () => {
      // Arrange
      service.list.mockResolvedValue({ items: [], total: 0, page: 2, limit: 5, totalPages: 0 });
      const req = { query: { search: 'venta', page: '2', limit: '5' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.list(req, res);

      // Assert
      expect(service.list).toHaveBeenCalledWith({ search: 'venta', page: 2, limit: 5 });
    });
  });

  describe('create', () => {
    it('should return 201 with the created activity', async () => {
      // Arrange
      service.create.mockResolvedValue(sampleActivity);
      const req = { body: { name: 'Ventas' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: sampleActivity })
      );
    });

    it('should return 400 when name is missing', async () => {
      // Arrange
      const req = { body: {} } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(service.create).not.toHaveBeenCalled();
    });

    it('should return 409 when the service reports a conflict', async () => {
      // Arrange
      service.create.mockRejectedValue(new ConflictError('duplicate'));
      const req = { body: { name: 'Ventas' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.create(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('update', () => {
    it('should return 200 with the updated activity', async () => {
      // Arrange
      service.update.mockResolvedValue(sampleActivity);
      const req = { params: { id: '1' }, body: { name: 'Ventas' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when id is not a valid integer', async () => {
      // Arrange
      const req = { params: { id: 'abc' }, body: { name: 'Ventas' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('should return 404 when the service reports not found', async () => {
      // Arrange
      service.update.mockRejectedValue(new NotFoundError('missing'));
      const req = { params: { id: '999' }, body: { name: 'Ventas' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 409 when the service reports a conflict', async () => {
      // Arrange
      service.update.mockRejectedValue(new ConflictError('duplicate'));
      const req = { params: { id: '1' }, body: { name: 'Marketing' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.update(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('updateStatus', () => {
    it('should return 200 with the updated activity', async () => {
      // Arrange
      service.updateStatus.mockResolvedValue(sampleActivity);
      const req = { params: { id: '1' }, body: { active: false } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.updateStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 400 when active is not a boolean', async () => {
      // Arrange
      const req = { params: { id: '1' }, body: { active: 'nope' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.updateStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(service.updateStatus).not.toHaveBeenCalled();
    });

    it('should return 404 when the activity does not exist', async () => {
      // Arrange
      service.updateStatus.mockRejectedValue(new NotFoundError('missing'));
      const req = { params: { id: '999' }, body: { active: true } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.updateStatus(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('export', () => {
    it('should set xlsx headers and delegate streaming to the service', async () => {
      // Arrange
      service.exportToExcel.mockResolvedValue(undefined);
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.export(req, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(service.exportToExcel).toHaveBeenCalledWith(res, undefined);
    });

    it('should forward the search query parameter to the service', async () => {
      // Arrange
      service.exportToExcel.mockResolvedValue(undefined);
      const req = { query: { search: 'venta' } } as unknown as Request;
      const res = createMockResponse();

      // Act
      await controller.export(req, res);

      // Assert
      expect(service.exportToExcel).toHaveBeenCalledWith(res, 'venta');
    });

    it('should return a JSON error when the export fails before the stream started', async () => {
      // Arrange
      service.exportToExcel.mockRejectedValue(new Error('db down'));
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      res.headersSent = false;

      // Act
      await controller.export(req, res);

      // Assert
      expect(res.removeHeader).toHaveBeenCalledWith('Content-Type');
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: 'db down', code: 'INTERNAL_ERROR' }
      });
    });

    it('should end the response without a JSON body when the export fails after headers were sent', async () => {
      // Arrange
      const req = { query: {} } as unknown as Request;
      const res = createMockResponse();
      service.exportToExcel.mockImplementation(async () => {
        res.headersSent = true;
        throw new Error('mid-stream failure');
      });

      // Act
      await controller.export(req, res);

      // Assert
      expect(res.end).toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});
