import { Department } from "./department.model";

export interface Course {
  id: number;
  courseCode: string; // e.g., CS101, MA202
  courseName: string;
  departmentId: number; // FK to departments table
  department?: Department; // Optional for populated data
  credits?: number;
  description?: string;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
