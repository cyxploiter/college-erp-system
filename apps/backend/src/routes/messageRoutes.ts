
import { Router } from 'express';
import * as messageController from '@/controllers/messageController';
import { authMiddleware, authorize } from '@/middleware/authMiddleware';
import { validate } from '@/middleware/validationMiddleware';

const router = Router();

router.use(authMiddleware);

// Send a message (can be broadcast or direct, controlled by 'type' and 'receiverId' in body)
// Admins and faculty can send messages. Students typically cannot initiate new messages in this model,
// but this can be adjusted based on requirements.
router.post('/', authorize(['admin', 'faculty']), validate(messageController.createMessageSchema), messageController.sendMessage);

// Get messages for the authenticated user
router.get('/my', messageController.getMyMessages);

// Mark a message as read
router.patch('/:messageId/read', validate(messageController.markAsReadSchema), messageController.markMessageRead);


export default router;
