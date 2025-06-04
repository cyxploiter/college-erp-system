
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { UserPayload } from '@college-erp/common';

const JWT_SECRET = config.JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; // Or from config: config.JWT_EXPIRES_IN

export const generateToken = (payload: UserPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): UserPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};
