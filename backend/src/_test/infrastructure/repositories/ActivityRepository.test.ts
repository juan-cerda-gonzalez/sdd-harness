import { PrismaClient } from '@prisma/client';
import { ActivityRepository } from '../../../infrastructure/repositories/ActivityRepository';

type MockPrismaClient = {
  activity: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

function createMockPrisma(): MockPrismaClient {
  return {
    activity: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    }
  };
}

const sampleRecord = {
  id: 1,
  name: 'Ventas',
  active: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  createdBy: null
};

describe('ActivityRepository', () => {
  let mockPrisma: MockPrismaClient;
  let repository: ActivityRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    repository = new ActivityRepository(mockPrisma as unknown as PrismaClient);
  });

  describe('findMany', () => {
    it('should build pagination skip/take from page and limit', async () => {
      // Arrange
      mockPrisma.activity.findMany.mockResolvedValue([sampleRecord]);
      mockPrisma.activity.count.mockResolvedValue(1);

      // Act
      const result = await repository.findMany({ page: 2, limit: 10 });

      // Assert
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        orderBy: { id: 'asc' }
      });
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Ventas');
    });

    it('should build a case-insensitive ILIKE-equivalent where clause when search is provided', async () => {
      // Arrange
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      // Act
      await repository.findMany({ search: 'venta', page: 1, limit: 10 });

      // Assert
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'venta', mode: 'insensitive' } },
        skip: 0,
        take: 10,
        orderBy: { id: 'asc' }
      });
    });

    it('should not apply a name filter when search is an empty string', async () => {
      // Arrange
      mockPrisma.activity.findMany.mockResolvedValue([]);
      mockPrisma.activity.count.mockResolvedValue(0);

      // Act
      await repository.findMany({ search: '   ', page: 1, limit: 10 });

      // Assert
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  describe('findAllMatching', () => {
    it('should query without pagination', async () => {
      // Arrange
      mockPrisma.activity.findMany.mockResolvedValue([sampleRecord]);

      // Act
      const result = await repository.findAllMatching('venta');

      // Assert
      expect(mockPrisma.activity.findMany).toHaveBeenCalledWith({
        where: { name: { contains: 'venta', mode: 'insensitive' } },
        orderBy: { id: 'asc' }
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findById', () => {
    it('should return an activity when found', async () => {
      // Arrange
      mockPrisma.activity.findUnique.mockResolvedValue(sampleRecord);

      // Act
      const result = await repository.findById(1);

      // Assert
      expect(mockPrisma.activity.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result?.name).toBe('Ventas');
    });

    it('should return null when not found', async () => {
      // Arrange
      mockPrisma.activity.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findById(999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByNameCaseInsensitive', () => {
    it('should query by case-insensitive equals without excludeId', async () => {
      // Arrange
      mockPrisma.activity.findFirst.mockResolvedValue(sampleRecord);

      // Act
      const result = await repository.findByNameCaseInsensitive('ventas');

      // Assert
      expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'ventas', mode: 'insensitive' } }
      });
      expect(result?.name).toBe('Ventas');
    });

    it('should exclude the given id when excludeId is provided', async () => {
      // Arrange
      mockPrisma.activity.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByNameCaseInsensitive('ventas', 1);

      // Assert
      expect(mockPrisma.activity.findFirst).toHaveBeenCalledWith({
        where: { name: { equals: 'ventas', mode: 'insensitive' }, id: { not: 1 } }
      });
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should persist a new activity with createdBy defaulted to null', async () => {
      // Arrange
      mockPrisma.activity.create.mockResolvedValue(sampleRecord);

      // Act
      const result = await repository.create({ name: 'Ventas' });

      // Assert
      expect(mockPrisma.activity.create).toHaveBeenCalledWith({
        data: { name: 'Ventas', createdBy: null }
      });
      expect(result.name).toBe('Ventas');
    });
  });

  describe('update', () => {
    it('should update the activity name', async () => {
      // Arrange
      mockPrisma.activity.update.mockResolvedValue({ ...sampleRecord, name: 'Nuevo nombre' });

      // Act
      const result = await repository.update(1, { name: 'Nuevo nombre' });

      // Assert
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: 'Nuevo nombre' }
      });
      expect(result.name).toBe('Nuevo nombre');
    });
  });

  describe('updateStatus', () => {
    it('should update the active flag', async () => {
      // Arrange
      mockPrisma.activity.update.mockResolvedValue({ ...sampleRecord, active: false });

      // Act
      const result = await repository.updateStatus(1, false);

      // Assert
      expect(mockPrisma.activity.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { active: false }
      });
      expect(result.active).toBe(false);
    });
  });
});
