// Note: UserRole would typically be defined in api types and imported if needed here,
// but since it's not directly used in these model definitions, no import is strictly necessary
// unless a model explicitly needs to reference UserRole type for a property.

export interface User {
  id: string; // Changed from number
  name: string; 
  passwordHash?: string; // Should not be sent to client
  email: string;
  profilePictureUrl?: string | null; 
  departmentId?: number | null; 
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface StudentDetail {
  id: number; // Internal primary key for the students table itself
  userId: string; // Foreign key to users table, Changed from number
  // studentRegistrationId: string; // REMOVED - This is now users.id
  enrollmentDate?: string | null; // ISO date string
  
  program?: string | null; 
  branch?: string | null; 
  
  expectedGraduationYear?: number | null; 
  currentYearOfStudy?: number | null; 
  gpa?: number | null; 
  academicStatus?: string | null; 

  fatherName?: string | null; 
  motherName?: string | null; 
  dateOfBirth?: string | null; 
  phoneNumber?: string | null; 
  permanentAddress?: string | null; 
  currentAddress?: string | null; 

  enrolledSectionIds?: number[]; // Added for managing section enrollments

  createdAt: string;
  updatedAt: string;
}

export interface FacultyDetail {
  id: number; // Internal primary key for the faculty table itself
  userId: string; // Foreign key to users table, Changed from number
  // facultyEmployeeId: string; // REMOVED - This is now users.id
  departmentId: number; 
  officeNumber?: string | null;
  specialization?: string | null;
  assignedSectionIds?: number[]; // Added for managing section assignments
  createdAt: string;
  updatedAt: string;
}

export interface AdminDetail {
  id: number; // Internal primary key for the admins table itself
  userId: string; // Foreign key to users table, Changed from number
  // adminEmployeeId: string; // REMOVED - This is now users.id
  permissionLevel?: string | null; 
  createdAt: string;
  updatedAt: string;
}

export interface SuperuserDetail {
  id: number; // Internal primary key for the superusers table itself
  userId: string; // Foreign key to users table, Changed from number
  // superuserEmployeeId: string; // REMOVED - This is now users.id
  permissions?: string | null; // JSON string for specific permissions
  createdAt: string;
  updatedAt: string;
}