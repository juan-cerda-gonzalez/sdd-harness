import 'dotenv/config';
import express from 'express';
import { loadDatabaseConfig } from './infrastructure/config/databaseConfig';
import { prisma } from './infrastructure/prismaClient';
import { ActivityRepository } from './infrastructure/repositories/ActivityRepository';
import { ActivityService } from './application/services/activityService';
import { ActivityController } from './presentation/controllers/activityController';
import { createActivityRoutes } from './presentation/routes/activityRoutes';

loadDatabaseConfig();

const app = express();
app.use(express.json());

const activityRepository = new ActivityRepository(prisma);
const activityService = new ActivityService(activityRepository);
const activityController = new ActivityController(activityService);

app.use('/api', createActivityRoutes(activityController));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
