export interface Semester {
  id: number;
  name: string; // e.g., "Fall 2024", "Spring 2025"
  year: number; // e.g., 2024
  term: 'Fall' | 'Spring' | 'Summer' | 'Winter' | string; // e.g., "Fall", "1" (for Sem 1)
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
