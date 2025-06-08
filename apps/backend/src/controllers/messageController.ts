
import { Response, NextFunction } from 'express';
import * as messageService from '@/services/messageService';
import { AuthenticatedRequest, APIResponse, Message, UserPayload, RealtimeMessagePayload } from '@/types';
import { z } from 'zod';
import { HttpError } from '@/middleware/errorHandler';
import { getIoInstance } from '@/realtime/socketHandler'; 

export const createMessageSchema = z.object({
  body: z.object({
    receiverId: z.string().optional().nullable(), // Receiver ID will be string (e.g., A1234, F5678)
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
    const senderId = req.user.id; // req.user.id is string

    // receiverId from body is already string, messageService expects string. No parseInt needed.
    const messageData = { senderId, receiverId, subject, content, type, priority };
    const newMessage = await messageService.createMessage(messageData);

    const io = getIoInstance();
    if (io) {
      const realtimePayload: RealtimeMessagePayload = {
        id: newMessage.id.toString(), // message.id is number (PK of messages table)
        sender: req.user.name, 
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
    (next as any)(error);
  }
};

export const getMyMessages = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError('Unauthorized', 401);
    const messages = await messageService.getReceivedMessagesForUser(req.user.id); // req.user.id is string
    const response: APIResponse<Message[]> = {
        success: true,
        data: messages
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const markAsReadSchema = z.object({
  params: z.object({
    messageId: z.coerce.number().int().positive("Message ID must be a positive integer"), // messageId in DB is int
  }),
});

export const markMessageRead = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) throw new HttpError('Unauthorized', 401);
    const { messageId } = (req as any).params as { messageId: string }; // messageId from param string
    const numericMessageId = parseInt(messageId, 10); // Convert to number for service
    
    const success = await messageService.markMessageAsRead(numericMessageId, req.user.id); // req.user.id is string
    if (!success) {
        throw new HttpError("Failed to mark message as read or message not found.", 404);
    }
    const response: APIResponse<null> = {
        success: true,
        message: "Message marked as read."
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};