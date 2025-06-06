import { User } from "./user.model";
import { Section } from "./section.model";

export interface StudentEnrollment {
  id: number;
  studentUserId: string; // FK to users table (student). Changed from number
  sectionId: number; // FK to sections table
  enrollmentDate: string; // ISO date string
  grade?: string | null;

  student?: Pick<User, "name" | "email"> & { id?: string }; // User.id is now string
  section?: Section;

  createdAt: string;
  updatedAt: string;
}
