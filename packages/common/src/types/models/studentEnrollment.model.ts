import { User } from './user.model';
import { Section } from './section.model';

export interface StudentEnrollment {
  id: number;
  studentUserId: number; // FK to users table (student)
  sectionId: number; // FK to sections table
  enrollmentDate: string; // ISO date string
  grade?: string | null; // Optional grade for the course section

  // Optional populated fields
  student?: Pick<User, 'id' | 'username' | 'email'>;
  section?: Section;

  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
