import { PassThrough } from 'stream';
import { ActivityService } from '../../../application/services/activityService';
import { Activity } from '../../../domain/models/Activity';
import { ConflictError, NotFoundError } from '../../../domain/errors';
import { IActivityRepository } from '../../../domain/repositories/IActivityRepository';

function createMockRepository(): jest.Mocked<IActivityRepository> {
  return {
    findMany: jest.fn(),
    findAllMatching: jest.fn(),
    findById: jest.fn(),
    findByNameCaseInsensitive: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStatus: jest.fn()
  };
}

const existingActivity = new Activity({ id: 1, name: 'Ventas', active: true });

describe('ActivityService', () => {
  let repository: jest.Mocked<IActivityRepository>;
  let service: ActivityService;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = createMockRepository();
    service = new ActivityService(repository);
  });

  describe('list', () => {
    it('should apply default page and limit when none are provided', async () => {
      // Arrange
      repository.findMany.mockResolvedValue({ items: [existingActivity], total: 1 });

      // Act
      const result = await service.list({});

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith({ search: undefined, page: 1, limit: 10 });
      expect(result).toEqual({ items: [existingActivity], total: 1, page: 1, limit: 10, totalPages: 1 });
    });

    it('should cap the limit at the maximum of 10 when a higher limit is requested', async () => {
      // Arrange
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      // Act
      await service.list({ limit: 50 });

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith({ search: undefined, page: 1, limit: 10 });
    });

    it('should return totalPages 0 when there are no results', async () => {
      // Arrange
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      // Act
      const result = await service.list({});

      // Assert
      expect(result.totalPages).toBe(0);
    });

    it('should compute totalPages for the last page correctly', async () => {
      // Arrange
      repository.findMany.mockResolvedValue({ items: [existingActivity], total: 21 });

      // Act
      const result = await service.list({ page: 3, limit: 10 });

      // Assert
      expect(result.totalPages).toBe(3);
    });

    it('should fall back to defaults when page or limit is not positive', async () => {
      // Arrange
      repository.findMany.mockResolvedValue({ items: [], total: 0 });

      // Act
      await service.list({ page: -1, limit: 0 });

      // Assert
      expect(repository.findMany).toHaveBeenCalledWith({ search: undefined, page: 1, limit: 10 });
    });
  });

  describe('create', () => {
    it('should create the activity when no duplicate exists', async () => {
      // Arrange
      repository.findByNameCaseInsensitive.mockResolvedValue(null);
      repository.create.mockResolvedValue(existingActivity);

      // Act
      const result = await service.create('Ventas');

      // Assert
      expect(repository.findByNameCaseInsensitive).toHaveBeenCalledWith('Ventas');
      expect(repository.create).toHaveBeenCalledWith({ name: 'Ventas', createdBy: undefined });
      expect(result).toBe(existingActivity);
    });

    it('should throw ConflictError when an activity with the same name already exists', async () => {
      // Arrange
      repository.findByNameCaseInsensitive.mockResolvedValue(existingActivity);

      // Act & Assert
      await expect(service.create('ventas')).rejects.toThrow(ConflictError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update the activity when it exists and the new name is not taken', async () => {
      // Arrange
      repository.findById.mockResolvedValue(existingActivity);
      repository.findByNameCaseInsensitive.mockResolvedValue(null);
      const updated = new Activity({ id: 1, name: 'Nuevo nombre', active: true });
      repository.update.mockResolvedValue(updated);

      // Act
      const result = await service.update(1, 'Nuevo nombre');

      // Assert
      expect(repository.findByNameCaseInsensitive).toHaveBeenCalledWith('Nuevo nombre', 1);
      expect(result).toBe(updated);
    });

    it('should throw NotFoundError when the activity does not exist', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update(999, 'Nuevo nombre')).rejects.toThrow(NotFoundError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when another activity already has the new name', async () => {
      // Arrange
      repository.findById.mockResolvedValue(existingActivity);
      const otherActivity = new Activity({ id: 2, name: 'Marketing', active: true });
      repository.findByNameCaseInsensitive.mockResolvedValue(otherActivity);

      // Act & Assert
      await expect(service.update(1, 'Marketing')).rejects.toThrow(ConflictError);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should allow renaming an activity to its own current name', async () => {
      // Arrange
      repository.findById.mockResolvedValue(existingActivity);
      repository.findByNameCaseInsensitive.mockResolvedValue(null);
      repository.update.mockResolvedValue(existingActivity);

      // Act
      const result = await service.update(1, 'Ventas');

      // Assert
      expect(result).toBe(existingActivity);
    });
  });

  describe('updateStatus', () => {
    it('should toggle the active flag when the activity exists', async () => {
      // Arrange
      repository.findById.mockResolvedValue(existingActivity);
      const deactivated = new Activity({ id: 1, name: 'Ventas', active: false });
      repository.updateStatus.mockResolvedValue(deactivated);

      // Act
      const result = await service.updateStatus(1, false);

      // Assert
      expect(repository.updateStatus).toHaveBeenCalledWith(1, false);
      expect(result.active).toBe(false);
    });

    it('should throw NotFoundError when the activity does not exist', async () => {
      // Arrange
      repository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.updateStatus(999, true)).rejects.toThrow(NotFoundError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('exportToExcel', () => {
    it('should reuse the same filter as list and stream the XLSX output as rows are written', async () => {
      // Arrange
      repository.findAllMatching.mockResolvedValue([existingActivity]);
      const destination = new PassThrough();
      const chunks: Buffer[] = [];
      destination.on('data', (chunk) => chunks.push(chunk));

      // Act
      await service.exportToExcel(destination, 'venta');

      // Assert
      expect(repository.findAllMatching).toHaveBeenCalledWith('venta');
      expect(Buffer.concat(chunks).length).toBeGreaterThan(0);
    });

    it('should propagate repository errors before writing to the destination stream', async () => {
      // Arrange
      repository.findAllMatching.mockRejectedValue(new Error('database failure'));
      const destination = new PassThrough();
      const chunks: Buffer[] = [];
      destination.on('data', (chunk) => chunks.push(chunk));

      // Act & Assert
      await expect(service.exportToExcel(destination)).rejects.toThrow('database failure');
      expect(chunks).toHaveLength(0);
    });
  });
});
