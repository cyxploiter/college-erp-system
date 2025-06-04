
import { Router } from 'express';
import * as userController from '@/controllers/userController';
import { authMiddleware } from '@/middleware/authMiddleware';

const router = Router();

// All routes under /users require authentication
router.use(authMiddleware);

router.get('/me', userController.getMyProfile);
// Example admin route:
// router.get('/:id', authorize(['admin']), userController.getUserById);

export default router;
