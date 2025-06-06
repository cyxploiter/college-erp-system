export interface APIResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: unknown;
}

export type UserRole = "student" | "faculty" | "admin" | "superuser";
