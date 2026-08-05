const mockPrismaClientConstructor = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: mockPrismaClientConstructor
}));

describe('prismaClient', () => {
  it('should construct a single PrismaClient instance on import', () => {
    // Act
    jest.isolateModules(() => {
      require('../../infrastructure/prismaClient');
    });

    // Assert
    expect(mockPrismaClientConstructor).toHaveBeenCalledTimes(1);
  });
});
