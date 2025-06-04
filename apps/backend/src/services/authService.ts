
import bcrypt from 'bcryptjs';
import { get } from '@/db/db';
import { User, UserPayload, LoginResponse } from '@college-erp/common';
import { generateToken } from '@/utils/jwt';
import { HttpError } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

export const loginUser = async (username: string, pass: string): Promise<LoginResponse> => {
  logger.info(`Attempting login for user: ${username}`);
  const user = await get<User>('SELECT id, username, passwordHash, role, email FROM users WHERE username = ? OR email = ?', [username, username]);

  if (!user || !user.passwordHash) {
    logger.warn(`Login failed: User ${username} not found.`);
    throw new HttpError('Invalid username or password.', 401);
  }

  const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
  if (!isPasswordValid) {
    logger.warn(`Login failed: Invalid password for user ${username}.`);
    throw new HttpError('Invalid username or password.', 401);
  }

  const userPayload: UserPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
  };

  const token = generateToken(userPayload);
  logger.info(`User ${username} logged in successfully.`);
  
  return { token, user: userPayload };
};
