
import { UserRole } from './api';

export interface User {
  id: number;
  username: string;
  passwordHash?: string; // Should not be sent to client
  role: UserRole;
  email: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface ScheduleItem {
  id: number;
  className: string;
  roomNumber: string;
  startTime: string; // ISO date string
  endTime:string; // ISO date string
  dayOfWeek: string; // e.g., 'Monday', 'Tuesday'
  userId: number; // Foreign key to users table
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

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
  sender?: User; // Optional: for populating sender details
}
