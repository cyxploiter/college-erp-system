
import { get } from '@/db/db';
import { User, UserPayload } from '@college-erp/common';
import { HttpError } from '@/middleware/errorHandler';
import logger from '@/utils/logger';


export const getUserProfileById = async (userId: number): Promise<UserPayload> => {
  logger.debug(`Fetching profile for user ID: ${userId}`);
  // Select only necessary fields for the payload, excluding passwordHash
  const user = await get<User>('SELECT id, username, role, email, createdAt, updatedAt FROM users WHERE id = ?', [userId]);

  if (!user) {
    logger.warn(`User profile not found for ID: ${userId}`);
    throw new HttpError('User not found.', 404);
  }
  
  const userPayload: UserPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email
  }
  logger.info(`Profile fetched for user ${user.username} (ID: ${userId})`);
  return userPayload;
};

// Add other user-related service functions here (e.g., createUser, updateUser, listUsers for admin)
