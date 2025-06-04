
import { Router } from 'express';
import * as authController from '@/controllers/authController';
import { validate } from '@/middleware/validationMiddleware';

const router = Router();

router.post('/login', validate(authController.loginSchema), authController.login);

export default router;
