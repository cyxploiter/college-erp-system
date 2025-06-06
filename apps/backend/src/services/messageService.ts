import { run, all, get } from "@/db/db";
import { Message, User, UserPayload } from "@college-erp/common"; // UserPayload might not be needed here
import { HttpError } from "@/middleware/errorHandler";
import logger from "@/utils/logger";

interface CreateMessageInput {
  senderId?: string | null; // Changed from number
  receiverId?: string | null; // Changed from number
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

  if (type === "Direct" && !receiverId) {
    throw new HttpError("Receiver ID is required for direct messages.", 400);
  }
  if (type === "Direct" && !senderId) {
    throw new HttpError("Sender ID is required for direct messages.", 400);
  }

  const result = await run(
    "INSERT INTO messages (senderId, receiverId, subject, content, type, priority, timestamp) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
    [senderId, receiverId, subject, content, type, priority]
  );

  // The 'id' of the message itself is still an auto-incrementing integer
  const newMessageFromDb = await get<Message & { senderName?: string }>(
    `SELECT m.*, s.name as senderName 
     FROM messages m 
     LEFT JOIN users s ON m.senderId = s.id -- s.id is TEXT, m.senderId is TEXT
     WHERE m.id = ?`,
    [result.lastID] // result.lastID is for the messages.id (integer)
  );
  if (!newMessageFromDb) {
    logger.error(
      `Failed to retrieve newly created message with ID: ${result.lastID}`
    );
    throw new HttpError("Failed to create message.", 500);
  }
  logger.info(`Message created with ID: ${newMessageFromDb.id}`);

  const newMessage: Message = { ...newMessageFromDb };
  if (newMessageFromDb.senderName) {
    newMessage.sender = {
      name: newMessageFromDb.senderName,
      id: newMessageFromDb.senderId,
    } as Partial<User> & { id?: string }; // Add senderId to sender object
  }
  delete (newMessage as any).senderName;

  return newMessage;
};

export const getReceivedMessagesForUser = async (
  userId: string
): Promise<Message[]> => {
  // userId is string
  logger.debug(`Fetching received messages for user ID: ${userId}`);
  const messagesFromDb = await all<Message & { senderName?: string }>(
    `SELECT m.id, m.senderId, m.receiverId, m.subject, m.content, m.timestamp, m.priority, m.type, m.createdAt, m.isRead, s.name as senderName
     FROM messages m
     LEFT JOIN users s ON m.senderId = s.id -- s.id is TEXT, m.senderId is TEXT
     WHERE (m.receiverId = ? AND m.type = 'Direct') OR (m.type = 'Broadcast')
     ORDER BY m.timestamp DESC`,
    [userId]
  );
  return messagesFromDb.map((msgFromDb) => {
    const msg: Message = { ...msgFromDb };
    if (msgFromDb.senderName) {
      msg.sender = {
        name: msgFromDb.senderName,
        id: msgFromDb.senderId,
      } as Partial<User> & { id?: string };
    }
    delete (msg as any).senderName;
    return msg;
  });
};

export const markMessageAsRead = async (
  messageId: number,
  userId: string
): Promise<boolean> => {
  // userId is string
  logger.debug(`Marking message ID ${messageId} as read for user ID ${userId}`);
  // messages.receiverId is TEXT
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

  // messages.id is INTEGER
  const result = await run("UPDATE messages SET isRead = TRUE WHERE id = ?", [
    messageId,
  ]);
  return result.changes > 0;
};
