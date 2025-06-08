
import { UserRole } from '../api/general.api'; 
import { User } from './user.model'; 

export interface Message {
  id: number;
  senderId?: string | null; // Foreign key to users table, null for system messages. Changed from number
  receiverId?: string | null; // Foreign key to users table, null for broadcast. Changed from number
  subject: string;
  content: string;
  timestamp: string; // ISO date string
  priority: 'Normal' | 'Urgent' | 'Critical';
  type: 'Broadcast' | 'Direct'; 
  createdAt: string; // ISO date string
  isRead?: boolean; 
  sender?: Partial<Omit<User, 'id'> & { id?: string }> & { role?: UserRole; senderUsername?: string }; // User.id is now string
}