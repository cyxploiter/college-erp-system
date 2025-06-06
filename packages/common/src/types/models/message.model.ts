
import { UserRole } from '../api/general.api'; // Relative import for UserRole
import { User } from './user.model'; // Relative import for User

export interface Message {
  id: number;
  senderId?: number | null; // Foreign key to users table, null for system messages
  receiverId?: number | null; // Foreign key to users table, null for broadcast
  subject: string;
  content: string;
  timestamp: string; // ISO date string
  priority: 'Normal' | 'Urgent' | 'Critical';
  type: 'Broadcast' | 'Direct'; // Type of message stored in DB
  createdAt: string; // ISO date string
  isRead?: boolean; // Added from init.ts
  sender?: Partial<User> & { role?: UserRole; senderUsername?: string }; // Optional: for populating sender details, role is dynamic
}
