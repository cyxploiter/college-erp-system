
import { Course } from './course.model';
import { Semester } from './semester.model';
import { User } from './user.model'; // For faculty

export interface Section {
  id: number;
  sectionCode: string; // e.g., "A", "B1", "001"
  courseId: number; // FK to courses table
  semesterId: number; // FK to semesters table
  facultyUserId?: number | null; // FK to users table (faculty teaching this section)
  roomNumber?: string | null; // Default room for the entire section
  maxCapacity?: number;
  
  // Optional populated fields
  course?: Course;
  semester?: Semester;
  faculty?: Pick<User, 'id' | 'username' | 'email'>; // Basic faculty info

  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
