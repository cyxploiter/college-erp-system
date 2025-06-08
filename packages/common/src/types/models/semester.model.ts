
export interface Semester {
  id: number;
  name: string; // e.g., "Odd 2024", "Even 2025"
  year: number; // e.g., 2024
  term: 'Odd' | 'Even' | string; // e.g., "Odd", "Even", or numeric like "1"
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
