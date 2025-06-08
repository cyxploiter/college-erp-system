
import { Course } from './course.model';
import { Semester } from './semester.model';
import { User } from './user.model'; // For faculty

export interface Section {
  id: number;
  sectionCode: string; 
  courseId: number; 
  semesterId: number; 
  facultyUserId?: string | null; // FK to users table (faculty teaching this section). Changed from number
  roomNumber?: string | null; 
  maxCapacity?: number;
  
  course?: Course;
  semester?: Semester;
  faculty?: Pick<User, 'name' | 'email'> & { id?: string }; // User.id is now string
  enrolledStudentsCount?: number; // Added for admin display

  createdAt: string; 
  updatedAt: string; 
}
