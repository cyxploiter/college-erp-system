import { Department } from '../models/department.model';
import { StudentDetail, FacultyDetail, AdminDetail, SuperuserDetail } from '../models/user.model';
import { UserRole } from './general.api';

// UserPayload is used for JWT and basic user info in API responses.
export interface UserPayload {
  id: string; // Changed from number
  name: string; 
  role: UserRole;
  email: string;
  profilePictureUrl?: string | null; 
  departmentId?: number | null;
  studentRegistrationId?: string | null; // This will be user.id if role is student
  program?: string | null; 
  branch?: string | null; 
}

// Example of a more detailed user profile response
export interface UserProfileResponse extends Omit<UserPayload, 'studentRegistrationId' | 'program' | 'branch'> { 
  id: string; // Ensure UserProfileResponse also has id as string, inherited from UserPayload but explicitly stated for clarity
  studentDetails?: StudentDetail; // Now includes enrolledSectionIds
  facultyDetails?: FacultyDetail; // Now includes assignedSectionIds
  adminDetails?: Omit<AdminDetail, 'userId'>;
  superuserDetails?: Omit<SuperuserDetail, 'userId'>;
  department?: Department; 
  createdAt: string;
  updatedAt: string;
  
  // Role-specific IDs, now populated from user.id by the backend if role matches
  studentRegistrationId?: string; 
  facultyEmployeeId?: string;
  adminEmployeeId?: string;
  superuserEmployeeId?: string;
  
  program?: string | null; 
  branch?: string | null;
}

// Interface for creating a new user
export interface CreateUserInput {
  name: string; 
  email: string;
  profilePictureUrl?: string;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: string;
  role: UserRole;
  departmentId?: number | null; 

  // Student specific
  program?: string;
  branch?: string;
  expectedGraduationYear?: number;
  currentYearOfStudy?: number;
  gpa?: number;
  academicStatus?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string; 
  phoneNumber?: string; 
  permanentAddress?: string;
  currentAddress?: string;
  enrolledSectionIds?: number[]; // For student section assignment

  // Faculty specific
  officeNumber?: string; 
  specialization?: string; 
  assignedSectionIds?: number[]; // For faculty section assignment

  // Admin specific
  permissionLevel?: string; 

  // Superuser specific
  superuserPermissions?: string; // JSON string
}

// Interface for updating an existing user
export interface UpdateUserInput {
  name?: string; 
  email?: string;
  profilePictureUrl?: string;
  role?: UserRole; // Typically role changes are complex and might not be supported via simple update
  departmentId?: number | null;

  // Student specific
  program?: string;
  branch?: string;
  expectedGraduationYear?: number;
  currentYearOfStudy?: number;
  gpa?: number;
  academicStatus?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string; 
  phoneNumber?: string; 
  permanentAddress?: string;
  currentAddress?: string;
  enrolledSectionIds?: number[]; // For student section assignment

  // Faculty specific
  officeNumber?: string;
  specialization?: string;
  assignedSectionIds?: number[]; // For faculty section assignment

  // Admin specific
  permissionLevel?: string;

  // Superuser specific
  superuserPermissions?: string;
}