export interface CreateSectionInput {
  courseId: number;
  semesterId: number;
  sectionLetter: string; // e.g., 'A', 'B', 'C'. Backend generates full code.
  facultyUserId?: string | null;
  roomNumber?: string | null;
  maxCapacity?: number | null; // If null/undefined, backend will use default.
}

export interface UpdateSectionInput {
  facultyUserId?: string | null;
  roomNumber?: string | null;
  maxCapacity?: number | null;
  // courseId, semesterId, sectionLetter are not updatable through this.
}

export interface SectionBasicInfo {
  id: number;
  sectionCode: string;
  courseName: string; // Denormalized for easy display
  semesterName: string; // Denormalized for easy display
  facultyName?: string | null; // Denormalized faculty name
}