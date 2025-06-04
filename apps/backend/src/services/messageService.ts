import { run, all, get } from "@/db/db";
import { Message, User } from "@college-erp/common";
import { HttpError } from "@/middleware/errorHandler";
import logger from "@/utils/logger";

interface CreateMessageInput {
  senderId?: number | null;
  receiverId?: number | null;
  subject: string;
  content: string;
  type: "Broadcast" | "Direct";
  priority?: "Normal" | "Urgent" | "Critical";
}

export const createMessage = async (
  input: CreateMessageInput
): Promise<Message> => {
  const {
    senderId,
    receiverId,
    subject,
    content,
    type,
    priority = "Normal",
  } = input;
  logger.debug(`Creating new message: type=${type}, subject=${subject}`);

  // Basic validation for direct messages
  if (type === "Direct" && !receiverId) {
    throw new HttpError("Receiver ID is required for direct messages.", 400);
  }
  if (type === "Direct" && !senderId) {
    // Direct messages should have a sender
    throw new HttpError("Sender ID is required for direct messages.", 400);
  }

  const result = await run(
    "INSERT INTO messages (senderId, receiverId, subject, content, type, priority, timestamp) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
    [senderId, receiverId, subject, content, type, priority]
  );

  const newMessage = await get<Message>(
    `SELECT m.*, s.username as senderUsername 
     FROM messages m 
     LEFT JOIN users s ON m.senderId = s.id
     WHERE m.id = ?`,
    [result.lastID]
  );
  if (!newMessage) {
    logger.error(
      `Failed to retrieve newly created message with ID: ${result.lastID}`
    );
    throw new HttpError("Failed to create message.", 500);
  }
  logger.info(`Message created with ID: ${newMessage.id}`);
  if (newMessage.sender?.username) {
    // Add sender username to the object
    newMessage.sender = { username: newMessage.sender.username } as User;
  }
  return newMessage;
};

export const getReceivedMessagesForUser = async (
  userId: number
): Promise<Message[]> => {
  logger.debug(`Fetching received messages for user ID: ${userId}`);
  // Fetches direct messages to the user and broadcast messages
  // For sender, we join users table to get username
  const messages = await all<Message>(
    `SELECT m.id, m.senderId, m.receiverId, m.subject, m.content, m.timestamp, m.priority, m.type, m.createdAt, m.isRead, s.username as senderUsername
     FROM messages m
     LEFT JOIN users s ON m.senderId = s.id
     WHERE (m.receiverId = ? AND m.type = 'Direct') OR (m.type = 'Broadcast')
     ORDER BY m.timestamp DESC`,
    [userId]
  );
  // Populate sender object
  return messages.map((msg) => ({
    ...msg,
    sender: msg.sender?.username
      ? ({ username: msg.sender.username } as User)
      : undefined,
  }));
};

export const markMessageAsRead = async (
  messageId: number,
  userId: number
): Promise<boolean> => {
  logger.debug(`Marking message ID ${messageId} as read for user ID ${userId}`);
  // Ensure the user is the receiver or it's a broadcast message they are entitled to read
  const message = await get<Message>(
    "SELECT receiverId, type FROM messages WHERE id = ?",
    [messageId]
  );
  if (!message) {
    throw new HttpError("Message not found.", 404);
  }
  if (message.type === "Direct" && message.receiverId !== userId) {
    throw new HttpError("Forbidden to mark this message as read.", 403);
  }

  const result = await run("UPDATE messages SET isRead = TRUE WHERE id = ?", [
    messageId,
  ]);
  return result.changes > 0;
};
