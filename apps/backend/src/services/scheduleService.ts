import { all, get } from "@/db/db";
import {
  ScheduleItem,
  Section,
  Course,
  Semester,
  User,
  StudentEnrollment,
  UserRole,
} from "@college-erp/common";
import logger from "@/utils/logger";

interface PopulatedScheduleItem extends Omit<ScheduleItem, "section"> {
  section: Section & {
    course?: Course;
    semester?: Semester;
    faculty?: Pick<User, "id" | "name" | "email">;
  };
  className?: string;
  facultyName?: string;
}

const populateSectionDetails = async (
  sectionId: number
): Promise<Section | null> => {
  const section = await get<
    Section & {
      // Type for raw DB result with aliased columns
      course_id: number;
      course_courseCode: string;
      course_courseName: string;
      course_credits: number;
      semester_id: number;
      semester_name: string;
      semester_year: number;
      semester_term: string;
      semester_startDate: string;
      semester_endDate: string;
      faculty_id?: string;
      faculty_name?: string;
      faculty_email?: string; // faculty_id is now string
    }
  >(
    `
        SELECT 
            s.*,
            c.id as course_id, c.courseCode as course_courseCode, c.courseName as course_courseName, c.credits as course_credits,
            sem.id as semester_id, sem.name as semester_name, sem.year as semester_year, sem.term as semester_term, sem.startDate as semester_startDate, sem.endDate as semester_endDate,
            u.id as faculty_id, u.name as faculty_name, u.email as faculty_email
        FROM sections s
        JOIN courses c ON s.courseId = c.id
        JOIN semesters sem ON s.semesterId = sem.id
        LEFT JOIN users u ON s.facultyUserId = u.id
        WHERE s.id = ?
    `,
    [sectionId]
  );

  if (!section) return null;

  const populatedSection: Section = {
    id: section.id,
    sectionCode: section.sectionCode,
    courseId: (section as any).course_id,
    semesterId: (section as any).semester_id,
    facultyUserId: (section as any).faculty_id, // This is the string user ID
    roomNumber: section.roomNumber,
    maxCapacity: section.maxCapacity,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
    course: {
      id: (section as any).course_id,
      courseCode: (section as any).course_courseCode,
      courseName: (section as any).course_courseName,
      departmentId: 0,
      credits: (section as any).course_credits,
      createdAt: "",
      updatedAt: "",
    },
    semester: {
      id: (section as any).semester_id,
      name: (section as any).semester_name,
      year: (section as any).semester_year,
      term: (section as any).semester_term,
      startDate: (section as any).semester_startDate,
      endDate: (section as any).semester_endDate,
      createdAt: "",
      updatedAt: "",
    },
    faculty: (section as any).faculty_id
      ? {
          // faculty.id is now string
          id: (section as any).faculty_id,
          name: (section as any).faculty_name,
          email: (section as any).faculty_email,
        }
      : undefined,
  };
  return populatedSection;
};

export const getUserSchedules = async (
  userId: string,
  userRole: UserRole
): Promise<PopulatedScheduleItem[]> => {
  // userId is string
  logger.debug(`Fetching schedules for user ID: ${userId}, Role: ${userRole}`);
  let sectionIds: number[] = [];

  if (userRole === "student") {
    // studentUserId in student_section_enrollments is now TEXT
    const enrollments = await all<StudentEnrollment>(
      "SELECT sectionId FROM student_section_enrollments WHERE studentUserId = ?",
      [userId]
    );
    sectionIds = enrollments.map((e) => e.sectionId);
  } else if (userRole === "faculty") {
    // facultyUserId in sections is now TEXT
    const sectionsTaught = await all<Section>(
      "SELECT id FROM sections WHERE facultyUserId = ?",
      [userId]
    );
    sectionIds = sectionsTaught.map((s) => s.id);
  } else {
    return [];
  }

  if (sectionIds.length === 0) {
    logger.info(
      `No sections found for user ID: ${userId}. Returning empty schedule.`
    );
    return [];
  }

  const placeholders = sectionIds.map(() => "?").join(",");
  const scheduleMeetings = await all<ScheduleItem>(
    `SELECT id, sectionId, startTime, endTime, roomNumber, createdAt, updatedAt 
     FROM schedules 
     WHERE sectionId IN (${placeholders}) 
     ORDER BY startTime ASC`,
    sectionIds
  );

  const populatedSchedules: PopulatedScheduleItem[] = [];
  for (const meeting of scheduleMeetings) {
    const populatedSection = await populateSectionDetails(meeting.sectionId);
    if (populatedSection) {
      populatedSchedules.push({
        ...meeting,
        section: populatedSection as PopulatedScheduleItem["section"],
        className: populatedSection.course?.courseName,
        facultyName: populatedSection.faculty?.name,
      });
    }
  }

  logger.info(
    `Found ${populatedSchedules.length} schedule items for user ID: ${userId}`
  );
  return populatedSchedules;
};
