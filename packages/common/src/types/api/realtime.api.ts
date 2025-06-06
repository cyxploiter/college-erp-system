
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
