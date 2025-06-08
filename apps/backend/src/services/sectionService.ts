import { get, all, run } from "@/db/db";
import {
  Section,
  Course,
  Semester,
  User,
  CreateSectionInput,
  UpdateSectionInput,
  Department,
  SectionBasicInfo,
} from "@college-erp/common";
import { HttpError } from "@/middleware/errorHandler";
import logger from "@/utils/logger";
import {
  departmentToBranchAbbr,
  getSemesterAbbrFromDetails,
} from "@/utils/sectionCodeHelper";

const populateSectionDetails = async (sectionRow: any): Promise<Section> => {
  // This function assumes sectionRow is a raw row from a JOIN query
  // and maps it to the Section interface with populated fields.
  const course: Course | undefined = sectionRow.courseId
    ? {
        id: sectionRow.courseId,
        courseCode: sectionRow.courseCode,
        courseName: sectionRow.courseName,
        departmentId: sectionRow.courseDepartmentId,
        credits: sectionRow.courseCredits,
        description: sectionRow.courseDescription,
        createdAt: sectionRow.courseCreatedAt,
        updatedAt: sectionRow.courseUpdatedAt,
      }
    : undefined;

  const semester: Semester | undefined = sectionRow.semesterId
    ? {
        id: sectionRow.semesterId,
        name: sectionRow.semesterName,
        year: sectionRow.semesterYear,
        term: sectionRow.semesterTerm,
        startDate: sectionRow.semesterStartDate,
        endDate: sectionRow.semesterEndDate,
        createdAt: sectionRow.semesterCreatedAt,
        updatedAt: sectionRow.semesterUpdatedAt,
      }
    : undefined;

  const faculty: (Pick<User, "name" | "email"> & { id?: string }) | undefined =
    sectionRow.facultyUserId
      ? {
          id: sectionRow.facultyUserId,
          name: sectionRow.facultyName,
          email: sectionRow.facultyEmail,
        }
      : undefined;

  return {
    id: sectionRow.id,
    sectionCode: sectionRow.sectionCode,
    courseId: sectionRow.courseId,
    semesterId: sectionRow.semesterId,
    facultyUserId: sectionRow.facultyUserId,
    roomNumber: sectionRow.roomNumber,
    maxCapacity: sectionRow.maxCapacity,
    createdAt: sectionRow.createdAt,
    updatedAt: sectionRow.updatedAt,
    course,
    semester,
    faculty,
    enrolledStudentsCount: sectionRow.enrolledStudentsCount || 0,
  };
};

export const getAllSections = async (): Promise<Section[]> => {
  logger.debug("Fetching all sections with populated details.");
  const rows = await all<any>(`
    SELECT 
      s.*,
      c.courseCode, c.courseName, c.departmentId as courseDepartmentId, c.credits as courseCredits, c.description as courseDescription, c.createdAt as courseCreatedAt, c.updatedAt as courseUpdatedAt,
      sem.name as semesterName, sem.year as semesterYear, sem.term as semesterTerm, sem.startDate as semesterStartDate, sem.endDate as semesterEndDate, sem.createdAt as semesterCreatedAt, sem.updatedAt as semesterUpdatedAt,
      u.name as facultyName, u.email as facultyEmail,
      (SELECT COUNT(*) FROM student_section_enrollments sse WHERE sse.sectionId = s.id) as enrolledStudentsCount
    FROM sections s
    JOIN courses c ON s.courseId = c.id
    JOIN semesters sem ON s.semesterId = sem.id
    LEFT JOIN users u ON s.facultyUserId = u.id
    ORDER BY s.id DESC
  `);
  return Promise.all(rows.map(populateSectionDetails));
};

export const getAllSectionsBasicInfo = async (): Promise<
  SectionBasicInfo[]
> => {
  logger.debug("Fetching basic info for all sections.");
  const rows = await all<any>(`
    SELECT 
      s.id,
      s.sectionCode,
      c.courseName,
      sem.name as semesterName,
      u.name as facultyName
    FROM sections s
    JOIN courses c ON s.courseId = c.id
    JOIN semesters sem ON s.semesterId = sem.id
    LEFT JOIN users u ON s.facultyUserId = u.id
    ORDER BY c.courseName ASC, sem.name ASC, s.sectionCode ASC
  `);
  return rows.map((row) => ({
    id: row.id,
    sectionCode: row.sectionCode,
    courseName: row.courseName,
    semesterName: row.semesterName,
    facultyName: row.facultyName,
  }));
};

export const getSectionById = async (id: number): Promise<Section | null> => {
  logger.debug(`Fetching section by ID: ${id}`);
  const row = await get<any>(
    `
    SELECT 
      s.*,
      c.courseCode, c.courseName, c.departmentId as courseDepartmentId, c.credits as courseCredits, c.description as courseDescription, c.createdAt as courseCreatedAt, c.updatedAt as courseUpdatedAt,
      sem.name as semesterName, sem.year as semesterYear, sem.term as semesterTerm, sem.startDate as semesterStartDate, sem.endDate as semesterEndDate, sem.createdAt as semesterCreatedAt, sem.updatedAt as semesterUpdatedAt,
      u.name as facultyName, u.email as facultyEmail,
      (SELECT COUNT(*) FROM student_section_enrollments sse WHERE sse.sectionId = s.id) as enrolledStudentsCount
    FROM sections s
    JOIN courses c ON s.courseId = c.id
    JOIN semesters sem ON s.semesterId = sem.id
    LEFT JOIN users u ON s.facultyUserId = u.id
    WHERE s.id = ?
  `,
    [id]
  );
  if (!row) return null;
  return populateSectionDetails(row);
};

export const createSection = async (
  data: CreateSectionInput
): Promise<Section> => {
  logger.info(
    `Creating new section for courseId: ${data.courseId}, semesterId: ${data.semesterId}, letter: ${data.sectionLetter}`
  );
  const {
    courseId,
    semesterId,
    sectionLetter,
    facultyUserId,
    roomNumber,
    maxCapacity,
  } = data;

  const course = await get<Course & { deptName: string }>(
    `SELECT c.*, d.name as deptName FROM courses c JOIN departments d ON c.departmentId = d.id WHERE c.id = ?`,
    [courseId]
  );
  if (!course) throw new HttpError("Course not found.", 404);

  const semester = await get<Semester>("SELECT * FROM semesters WHERE id = ?", [
    semesterId,
  ]);
  if (!semester) throw new HttpError("Semester not found.", 404);

  const branchAbbr = departmentToBranchAbbr[course.deptName] || "GN";
  const semesterAbbr = getSemesterAbbrFromDetails(semester.term, semester.year); // Corrected: pass term and year separately
  const finalSectionCode = `${branchAbbr}${semesterAbbr}${sectionLetter.toUpperCase()}`;

  const existingSection = await get(
    "SELECT id FROM sections WHERE courseId = ? AND semesterId = ? AND sectionCode = ?",
    [courseId, semesterId, finalSectionCode]
  );
  if (existingSection) {
    throw new HttpError(
      `Section with code ${finalSectionCode} for this course and semester already exists.`,
      409
    );
  }

  const effectiveMaxCapacity =
    maxCapacity === null || maxCapacity === undefined ? 60 : maxCapacity;

  const result = await run(
    "INSERT INTO sections (courseId, semesterId, sectionCode, facultyUserId, roomNumber, maxCapacity) VALUES (?, ?, ?, ?, ?, ?)",
    [
      courseId,
      semesterId,
      finalSectionCode,
      facultyUserId,
      roomNumber,
      effectiveMaxCapacity,
    ]
  );

  const newSection = await getSectionById(result.lastID);
  if (!newSection)
    throw new HttpError(
      "Failed to create section, could not retrieve after insert.",
      500
    );
  logger.info(
    `Section created with ID: ${newSection.id} and code: ${newSection.sectionCode}`
  );
  return newSection;
};

export const updateSectionById = async (
  id: number,
  data: UpdateSectionInput
): Promise<Section | null> => {
  logger.info(`Updating section ID: ${id}`);
  const { facultyUserId, roomNumber, maxCapacity } = data;

  const section = await getSectionById(id);
  if (!section) throw new HttpError("Section not found.", 404);

  const fieldsToUpdate: string[] = [];
  const values: (string | number | null)[] = [];

  // Handle facultyUserId being explicitly set to null (unassign)
  if (data.hasOwnProperty("facultyUserId")) {
    fieldsToUpdate.push("facultyUserId = ?");
    values.push(facultyUserId === undefined ? null : facultyUserId); // facultyUserId can be string or null
  }
  if (roomNumber !== undefined) {
    fieldsToUpdate.push("roomNumber = ?");
    values.push(roomNumber);
  }
  if (maxCapacity !== undefined && maxCapacity !== null) {
    fieldsToUpdate.push("maxCapacity = ?");
    values.push(maxCapacity);
  } else if (maxCapacity === null) {
    // If explicitly set to null in input, reset to default (e.g., 60) or handle as per business logic
    // For now, let's assume null means reset to default or keep as is if not allowed to be null by DB.
    // Given DB schema has NOT NULL DEFAULT 60, perhaps this case means "don't change" or "use default".
    // If the intention is to allow setting it to the DB default, we might omit it or send 60.
    // For this update, if maxCapacity is null in input, we'll set it to 60.
    fieldsToUpdate.push("maxCapacity = ?");
    values.push(60); // Reset to default if null
  }

  if (fieldsToUpdate.length === 0) {
    logger.warn(`No fields to update for section ID: ${id}`);
    return section;
  }

  values.push(id);
  const sql = `UPDATE sections SET ${fieldsToUpdate.join(
    ", "
  )}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
  await run(sql, values);

  const updatedSection = await getSectionById(id);
  if (!updatedSection) {
    logger.error(
      `Failed to retrieve updated section details for ID: ${id} post-update.`
    );
    throw new HttpError(
      "Section updated, but failed to fetch updated details.",
      500
    );
  }
  logger.info(`Section ID: ${id} updated successfully.`);
  return updatedSection;
};

export const deleteSectionById = async (id: number): Promise<void> => {
  logger.info(`Deleting section ID: ${id}`);
  const section = await getSectionById(id);
  if (!section) throw new HttpError("Section not found.", 404);

  if (section.enrolledStudentsCount && section.enrolledStudentsCount > 0) {
    throw new HttpError(
      `Cannot delete section: ${section.sectionCode} as it has ${section.enrolledStudentsCount} student(s) enrolled. Please unenroll students first.`,
      400
    );
  }

  const result = await run("DELETE FROM sections WHERE id = ?", [id]);
  if (result.changes === 0) {
    logger.warn(
      `Delete operation for section ID: ${id} resulted in no changes. Section might have been deleted already.`
    );
  }
  logger.info(`Section ID: ${id} deleted successfully.`);
};
