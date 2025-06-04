
import { Router } from 'express';
import * as scheduleController from '@/controllers/scheduleController';
import { authMiddleware } from '@/middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/my', scheduleController.getMySchedules);
// Example admin route:
// router.post('/', authorize(['admin']), scheduleController.createSchedule);

export default router;
