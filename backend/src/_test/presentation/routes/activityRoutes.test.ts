import express from 'express';
import request from 'supertest';
import { createActivityRoutes } from '../../../presentation/routes/activityRoutes';
import { ActivityController } from '../../../presentation/controllers/activityController';

function createMockController(): jest.Mocked<ActivityController> {
  return {
    list: jest.fn((_req, res) => res.status(200).json({ success: true, data: [] })),
    update: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
    updateStatus: jest.fn((_req, res) => res.status(200).json({ success: true, data: {} })),
    export: jest.fn((_req, res) => res.status(200).send('xlsx'))
  } as unknown as jest.Mocked<ActivityController>;
}

describe('activityRoutes', () => {
  it('should route each HTTP verb/path to the matching controller handler', async () => {
    // Arrange
    const controller = createMockController();
    const app = express();
    app.use(express.json());
    app.use('/api', createActivityRoutes(controller));

    // Act & Assert
    await request(app).get('/api/activities').expect(200);
    expect(controller.list).toHaveBeenCalledTimes(1);

    await request(app).get('/api/activities/export').expect(200);
    expect(controller.export).toHaveBeenCalledTimes(1);

    await request(app).put('/api/activities/1').send({ name: 'Ventas' }).expect(200);
    expect(controller.update).toHaveBeenCalledTimes(1);

    await request(app).patch('/api/activities/1/status').send({ active: false }).expect(200);
    expect(controller.updateStatus).toHaveBeenCalledTimes(1);
  });
});
