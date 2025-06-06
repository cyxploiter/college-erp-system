import { Department } from "../models/department.model";
import {
  StudentDetail,
  FacultyDetail,
  AdminDetail,
} from "../models/user.model";
import { UserRole } from "./general.api";

// UserPayload is used for JWT and basic user info in API responses.
// The 'role' here is determined dynamically by the backend.
export interface UserPayload {
  id: number;
  username: string;
  role: UserRole;
  email: string;
  departmentId?: number | null;
}

// Example of a more detailed user profile response
export interface UserProfileResponse extends UserPayload {
  studentDetails?: StudentDetail;
  facultyDetails?: FacultyDetail;
  adminDetails?: AdminDetail;
  department?: Department; // If user is associated with a department
  createdAt: string;
  updatedAt: string;
  // New formatted IDs
  studentRegistrationId?: string;
  facultyEmployeeId?: string;
  adminEmployeeId?: string;
}

// Interface for creating a new user
export interface CreateUserInput {
  username: string;
  email: string;
  // This specific field name is used by the backend service for clarity on password handling.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: string;
  role: UserRole;
  departmentId?: number | null;
  // Role-specific details
  major?: string; // For student
  officeNumber?: string; // For faculty
  specialization?: string; // For faculty
  permissionLevel?: string; // For admin
}

// Interface for updating an existing user
export interface UpdateUserInput {
  username?: string;
  email?: string;
  role?: UserRole; // Note: Backend service handles logic if role change is attempted/allowed
  departmentId?: number | null;
  // Role-specific details
  major?: string;
  officeNumber?: string;
  specialization?: string;
  permissionLevel?: string;
  // Password updates are typically handled via a separate, dedicated endpoint for security.
}
