// Note: UserRole would typically be defined in api types and imported if needed here,
// but since it's not directly used in these model definitions, no import is strictly necessary
// unless a model explicitly needs to reference UserRole type for a property.

export interface User {
  id: number;
  username: string;
  passwordHash?: string; // Should not be sent to client
  email: string;
  departmentId?: number | null; // Optional: Foreign key to departments table
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  // Role is now determined by association with StudentDetail, FacultyDetail, or AdminDetail
}

export interface StudentDetail {
  id: number;
  userId: number; // Foreign key to users table
  studentRegistrationId?: string; // e.g., "2025000001"
  enrollmentDate?: string | null; // ISO date string
  major?: string | null;
  // Add other student-specific fields here
  createdAt: string;
  updatedAt: string;
}

export interface FacultyDetail {
  id: number;
  userId: number; // Foreign key to users table
  facultyEmployeeId?: string; // e.g., "10123"
  departmentId: number; // Foreign key to departments table (faculty must belong to a department)
  officeNumber?: string | null;
  specialization?: string | null;
  // Add other faculty-specific fields here
  createdAt: string;
  updatedAt: string;
}

export interface AdminDetail {
  id: number;
  userId: number; // Foreign key to users table
  adminEmployeeId?: string; // e.g., "20001"
  permissionLevel?: string | null; // e.g., 'full_access', 'content_manager'
  // Add other admin-specific fields here
  createdAt: string;
  updatedAt: string;
}
