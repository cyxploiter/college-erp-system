
export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: unknown;
}

export interface UserPayload {
  id: number;
  username: string;
  role: UserRole;
  email: string;
}

export type UserRole = 'student' | 'faculty' | 'admin';

export interface LoginResponse {
  token: string;
  user: UserPayload;
}

export interface RealtimeMessagePayload {
  id: string; // Can be message ID from DB or a generated UUID for client-side notifications
  sender?: string; // Username or system
  subject?: string;
  content: string;
  timestamp: string; // ISO string
  priority: 'Normal' | 'Urgent' | 'Critical';
  type: 'Broadcast' | 'Direct' | 'SystemInfo' | 'SystemSuccess' | 'SystemError';
  title?: string; // For toast notifications
}
