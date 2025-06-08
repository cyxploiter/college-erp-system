
import { Router } from 'express';
// Changed from: import * as messageController from '@/controllers/messageController';
// Also changed from: import { ... } from '@/controllers/messageController';
import {
  createMessageSchema,
  sendMessage,
  getMyMessages,
  markAsReadSchema,
  markMessageRead
} from '../controllers/messageController'; // Using relative path
import { authMiddleware, authorize } from '@/middleware/authMiddleware';
import { validate } from '@/middleware/validationMiddleware';

const router = Router();

router.use(authMiddleware);

// Send a message (can be broadcast or direct, controlled by 'type' and 'receiverId' in body)
// Admins and faculty can send messages. Students typically cannot initiate new messages in this model,
// but this can be adjusted based on requirements.
router.post(
  '/', 
  authorize(['admin', 'faculty']), 
  validate(createMessageSchema), 
  sendMessage                   
);

// Get messages for the authenticated user
router.get(
  '/my', 
  getMyMessages                 
);

// Mark a message as read
router.patch(
  '/:messageId/read', 
  validate(markAsReadSchema),  
  markMessageRead                
);


export default router;