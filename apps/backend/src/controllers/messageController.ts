
import { Response, NextFunction } from 'express';
import * as messageService from '@/services/messageService';
import { AuthenticatedRequest, APIResponse, Message, UserPayload, RealtimeMessagePayload } from '@/types';
import { z } from 'zod';
import { HttpError } from '@/middleware/errorHandler';
import { getIoInstance } from '@/realtime/socketHandler'; // For emitting events

export const createMessageSchema = z.object({
  body: z.object({
    receiverId: z.number().int().positive().optional().nullable(),
    subject: z.string().min(1, "Subject is required").max(255),
    content: z.string().min(1, "Content is required"),
    type: z.enum(['Broadcast', 'Direct']),
    priority: z.enum(['Normal', 'Urgent', 'Critical']).optional().default('Normal'),
  }),
});

export const sendMessage = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError('Unauthorized', 401);

    const { receiverId, subject, content, type, priority } = (req as any).body;
    const senderId = req.user.id;

    const messageData = { senderId, receiverId, subject, content, type, priority };
    const newMessage = await messageService.createMessage(messageData);

    // Emit WebSocket event
    const io = getIoInstance();
    if (io) {
      const realtimePayload: RealtimeMessagePayload = {
        id: newMessage.id.toString(),
        sender: req.user.username,
        subject: newMessage.subject,
        content: newMessage.content,
        timestamp: newMessage.timestamp,
        priority: newMessage.priority,
        type: type === 'Broadcast' ? 'Broadcast' : 'Direct',
        title: type === 'Broadcast' ? `📢 ${subject}` : `📬 New Message: ${subject}`
      };

      if (type === 'Broadcast') {
        io.emit('receive:message', realtimePayload);
      } else if (receiverId) {
        // Emit to specific user room e.g., user:123
        io.to(`user:${receiverId}`).emit('receive:message', realtimePayload);
      }
    }
    
    const response: APIResponse<Message> = {
        success: true,
        data: newMessage,
        message: "Message sent successfully."
    };
    (res as any).status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const getMyMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError('Unauthorized', 401);
    const messages = await messageService.getReceivedMessagesForUser(req.user.id);
    const response: APIResponse<Message[]> = {
        success: true,
        data: messages
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const markAsReadSchema = z.object({
  params: z.object({
    messageId: z.coerce.number().int().positive("Message ID must be a positive integer"),
  }),
});

export const markMessageRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError('Unauthorized', 401);
    const { messageId } = (req as any).params as { messageId: string }; // Already validated by Zod
    const success = await messageService.markMessageAsRead(parseInt(messageId), req.user.id);
    if (!success) {
        throw new HttpError("Failed to mark message as read or message not found.", 404);
    }
    const response: APIResponse<null> = {
        success: true,
        message: "Message marked as read."
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};
