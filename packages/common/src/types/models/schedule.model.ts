import { Section } from './section.model';

// Represents a single meeting/class instance for a section
export interface ScheduleItem {
  id: number;
  sectionId: number; // FK to sections table
  startTime: string; // ISO date string (includes date and time)
  endTime: string; // ISO date string (includes date and time)
  roomNumber?: string | null; // Specific room for this meeting, can override section's default

  // Optional populated fields
  section?: Section; // Contains course, semester, faculty info

  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
