import dbDefault, { run, get, all } from "./db";
import bcrypt from "bcryptjs";
import logger from "@/utils/logger";
import {
  Department,
  UserRole,
  Course,
  Semester,
  Section,
} from "@college-erp/common";

// Declare Node.js globals for TypeScript
declare const require: any;
declare const module: any;

// Helper to get start of next week for schedule seeding
const getStartOfWeekISO = (date: Date, dayOfWeek: number) => {
  // 0=Sunday, 1=Monday
  const d = new Date(date);
  const currentDay = d.getDay();
  const diff =
    d.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + dayOfWeek; // Adjust to make Monday the first day for calculation if needed
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const generateUniqueEmployeeId = async (
  prefix: string,
  length: number,
  tableName: string,
  columnName: string
): Promise<string> => {
  let id;
  let isUnique = false;
  const maxAttempts = 10; // Prevent infinite loops
  let attempts = 0;

  while (!isUnique && attempts < maxAttempts) {
    // Generates a random suffix such that the total ID length (prefix + suffix) is `length`.
    // Assumes prefix is a single digit for this specific random number generation logic.
    const numSuffixDigits = length - prefix.length;
    if (numSuffixDigits <= 0) {
      throw new Error(
        `Cannot generate suffix for prefix "${prefix}" and total length ${length}.`
      );
    }
    const randomSuffix = Math.floor(
      Math.pow(10, numSuffixDigits - 1) +
        Math.random() *
          (Math.pow(10, numSuffixDigits) -
            Math.pow(10, numSuffixDigits - 1) -
            1)
    ).toString();
    id = `${prefix}${randomSuffix}`;
    const existing = await get(
      `SELECT 1 FROM ${tableName} WHERE ${columnName} = ?`,
      [id]
    );
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  if (!isUnique) {
    throw new Error(
      `Failed to generate unique ${columnName} for ${tableName} after ${maxAttempts} attempts.`
    );
  }
  return id!;
};

const seedDatabase = async () => {
  logger.info("Starting database seeding...");

  try {
    // 1. Seed Departments
    const departmentNames = [
      "Computer Science",
      "Mathematics",
      "Physics",
      "History",
    ];
    const departmentIds: { [name: string]: number } = {};
    for (const name of departmentNames) {
      try {
        const result = await run("INSERT INTO departments (name) VALUES (?)", [
          name,
        ]);
        departmentIds[name] = result.lastID;
        logger.info(`Department '${name}' inserted with ID ${result.lastID}.`);
      } catch (error) {
        const existingDept = await get<Department>(
          "SELECT id FROM departments WHERE name = ?",
          [name]
        );
        if (existingDept) departmentIds[name] = existingDept.id;
        logger.warn(
          `Department '${name}' already exists with ID ${departmentIds[name]}. Skipping insertion.`
        );
      }
    }

    // 2. Seed Users (Admin, Students, Faculty)
    const usersToSeed = [
      {
        username: "admin",
        password: "password123",
        email: "admin@example.com",
        role: "admin" as UserRole,
        departmentName: null,
      },
      {
        username: "student1",
        password: "password123",
        email: "student1@example.com",
        role: "student" as UserRole,
        departmentName: "Computer Science",
        major: "Software Engineering",
      },
      {
        username: "student2",
        password: "password123",
        email: "student2@example.com",
        role: "student" as UserRole,
        departmentName: "Mathematics",
        major: "Applied Mathematics",
      },
      {
        username: "faculty1",
        password: "password123",
        email: "faculty1@example.com",
        role: "faculty" as UserRole,
        departmentName: "Computer Science",
        office: "CS-101",
        spec: "AI",
      },
      {
        username: "faculty2",
        password: "password123",
        email: "faculty2@example.com",
        role: "faculty" as UserRole,
        departmentName: "Mathematics",
        office: "MA-205",
        spec: "Algebra",
      },
    ];
    const userIds: { [username: string]: number } = {};
    const facultyUserIds: { [username: string]: number } = {};
    let studentCounter = 0; // For generating studentRegistrationId suffix

    for (const userData of usersToSeed) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      const userPrimaryDepartmentId = userData.departmentName
        ? departmentIds[userData.departmentName]
        : null;
      try {
        const userInsertResult = await run(
          "INSERT INTO users (username, passwordHash, email, departmentId) VALUES (?, ?, ?, ?)",
          [
            userData.username,
            passwordHash,
            userData.email,
            userPrimaryDepartmentId,
          ]
        );
        userIds[userData.username] = userInsertResult.lastID;
        logger.info(
          `User ${userData.username} inserted with ID ${userInsertResult.lastID}.`
        );

        const currentUserId = userInsertResult.lastID;
        if (userData.role === "student") {
          studentCounter++;
          const studentRegistrationId = `2025${studentCounter
            .toString()
            .padStart(6, "0")}`;
          await run(
            "INSERT INTO students (userId, studentRegistrationId, major, enrollmentDate) VALUES (?, ?, ?, ?)",
            [
              currentUserId,
              studentRegistrationId,
              userData.major || "Undeclared",
              new Date().toISOString(),
            ]
          );
          logger.info(
            `Student ${userData.username} details inserted with studentRegistrationId ${studentRegistrationId}.`
          );
        } else if (userData.role === "faculty") {
          const facultyDeptIdForFacultyTable =
            departmentIds[userData.departmentName!];
          if (!facultyDeptIdForFacultyTable) {
            logger.error(
              `Faculty ${userData.username} department '${userData.departmentName}' not found. Skipping faculty details.`
            );
            continue;
          }
          // Generate 5-digit faculty employee ID (e.g., 1XXXX)
          const facultyEmployeeId = await generateUniqueEmployeeId(
            "1",
            5,
            "faculty",
            "facultyEmployeeId"
          );
          await run(
            "INSERT INTO faculty (userId, facultyEmployeeId, departmentId, officeNumber, specialization) VALUES (?, ?, ?, ?, ?)",
            [
              currentUserId,
              facultyEmployeeId,
              facultyDeptIdForFacultyTable,
              userData.office,
              userData.spec,
            ]
          );
          facultyUserIds[userData.username] = currentUserId;
          logger.info(
            `Faculty ${userData.username} details inserted with facultyEmployeeId ${facultyEmployeeId}.`
          );
        } else if (userData.role === "admin") {
          // Generate 5-digit admin employee ID (e.g., 2XXXX)
          const adminEmployeeId = await generateUniqueEmployeeId(
            "2",
            5,
            "admins",
            "adminEmployeeId"
          );
          await run(
            "INSERT INTO admins (userId, adminEmployeeId, permissionLevel) VALUES (?, ?, ?)",
            [currentUserId, adminEmployeeId, "full_access"]
          );
          logger.info(
            `Admin ${userData.username} details inserted with adminEmployeeId ${adminEmployeeId}.`
          );
        }
      } catch (error) {
        const existingUser = await get<{ id: number }>(
          "SELECT id FROM users WHERE username = ? OR email = ?",
          [userData.username, userData.email]
        );
        if (existingUser) {
          userIds[userData.username] = existingUser.id;
          if (userData.role === "faculty")
            facultyUserIds[userData.username] = existingUser.id;
        }
        logger.warn(
          `User ${userData.username} or email ${
            userData.email
          } already exists. ID: ${
            userIds[userData.username]
          }. Skipping insertion of user/role details. Error: ${
            (error as Error).message
          }`
        );
      }
    }

    for (const u of usersToSeed) {
      if (!userIds[u.username]) {
        const existing = await get<{ id: number }>(
          "SELECT id FROM users WHERE username = ?",
          [u.username]
        );
        if (existing) {
          userIds[u.username] = existing.id;
          if (u.role === "faculty") facultyUserIds[u.username] = existing.id;
        }
      }
    }

    // 3. Seed Semesters
    const semestersToSeed = [
      {
        name: "Fall 2024",
        year: 2024,
        term: "Fall",
        startDate: "2024-08-26",
        endDate: "2024-12-13",
      },
      {
        name: "Spring 2025",
        year: 2025,
        term: "Spring",
        startDate: "2025-01-13",
        endDate: "2025-05-02",
      },
    ];
    const semesterIds: { [name: string]: number } = {};
    for (const sem of semestersToSeed) {
      try {
        const result = await run(
          "INSERT INTO semesters (name, year, term, startDate, endDate) VALUES (?, ?, ?, ?, ?)",
          [sem.name, sem.year, sem.term, sem.startDate, sem.endDate]
        );
        semesterIds[sem.name] = result.lastID;
        logger.info(`Semester '${sem.name}' inserted.`);
      } catch (error) {
        const existingSem = await get<Semester>(
          "SELECT id FROM semesters WHERE name = ?",
          [sem.name]
        );
        if (existingSem) semesterIds[sem.name] = existingSem.id;
        logger.warn(`Semester '${sem.name}' already exists. Skipping.`);
      }
    }

    // 4. Seed Courses
    const coursesToSeed = [
      {
        courseCode: "CS101",
        courseName: "Intro to Programming",
        departmentName: "Computer Science",
        credits: 3,
      },
      {
        courseCode: "CS301",
        courseName: "Advanced Algorithms",
        departmentName: "Computer Science",
        credits: 3,
      },
      {
        courseCode: "MA101",
        courseName: "Calculus I",
        departmentName: "Mathematics",
        credits: 4,
      },
      {
        courseCode: "PY101",
        courseName: "General Physics I",
        departmentName: "Physics",
        credits: 4,
      },
    ];
    const courseIds: { [code: string]: number } = {};
    for (const course of coursesToSeed) {
      try {
        const result = await run(
          "INSERT INTO courses (courseCode, courseName, departmentId, credits) VALUES (?, ?, ?, ?)",
          [
            course.courseCode,
            course.courseName,
            departmentIds[course.departmentName],
            course.credits,
          ]
        );
        courseIds[course.courseCode] = result.lastID;
        logger.info(`Course '${course.courseCode}' inserted.`);
      } catch (error) {
        const existingCourse = await get<Course>(
          "SELECT id FROM courses WHERE courseCode = ?",
          [course.courseCode]
        );
        if (existingCourse) courseIds[course.courseCode] = existingCourse.id;
        logger.warn(`Course '${course.courseCode}' already exists. Skipping.`);
      }
    }

    // 5. Seed Sections
    const sectionsToSeed = [
      {
        sectionCode: "A",
        courseCode: "CS101",
        semesterName: "Fall 2024",
        facultyUsername: "faculty1",
        room: "CS-R1",
        cap: 30,
      },
      {
        sectionCode: "B",
        courseCode: "CS101",
        semesterName: "Fall 2024",
        facultyUsername: "faculty1",
        room: "CS-R2",
        cap: 30,
      },
      {
        sectionCode: "A",
        courseCode: "MA101",
        semesterName: "Fall 2024",
        facultyUsername: "faculty2",
        room: "MA-R1",
        cap: 35,
      },
    ];
    const sectionIds: { [key: string]: number } = {}; // Key: courseCode-semesterName-sectionCode
    for (const sec of sectionsToSeed) {
      const key = `${sec.courseCode}-${sec.semesterName}-${sec.sectionCode}`;
      try {
        const facultyIdToAssign = facultyUserIds[sec.facultyUsername];
        if (!facultyIdToAssign && sec.facultyUsername) {
          // Check if facultyUsername is defined before warning
          logger.warn(
            `Faculty ${sec.facultyUsername} not found for section ${key}, skipping faculty assignment.`
          );
        }
        const result = await run(
          "INSERT INTO sections (sectionCode, courseId, semesterId, facultyUserId, roomNumber, maxCapacity) VALUES (?, ?, ?, ?, ?, ?)",
          [
            sec.sectionCode,
            courseIds[sec.courseCode],
            semesterIds[sec.semesterName],
            facultyIdToAssign,
            sec.room,
            sec.cap,
          ]
        );
        sectionIds[key] = result.lastID;
        logger.info(`Section ${key} inserted with ID ${result.lastID}.`);
      } catch (error) {
        const existingSection = await get<Section>(
          `SELECT s.id FROM sections s 
             JOIN courses c ON s.courseId = c.id
             JOIN semesters sem ON s.semesterId = sem.id
             WHERE c.courseCode = ? AND sem.name = ? AND s.sectionCode = ?`,
          [sec.courseCode, sec.semesterName, sec.sectionCode]
        );
        if (existingSection) sectionIds[key] = existingSection.id;
        logger.warn(
          `Section ${key} already exists. Skipping. Error: ${
            (error as Error).message
          }`
        );
      }
    }

    // 6. Seed Schedules (Meeting Times for Sections)
    const cs101FallA_sectionId = sectionIds["CS101-Fall 2024-A"];
    if (cs101FallA_sectionId) {
      const fall2024StartDate = new Date(
        semestersToSeed.find((s) => s.name === "Fall 2024")!.startDate +
          "T00:00:00Z"
      );
      const meetingTimesCS101A = [
        {
          dayOfWeek: 1,
          startHour: 9,
          startMinute: 0,
          endHour: 10,
          endMinute: 30,
          room: "CS-R1A",
        },
        {
          dayOfWeek: 3,
          startHour: 9,
          startMinute: 0,
          endHour: 10,
          endMinute: 30,
          room: "CS-R1A",
        },
      ];
      for (const mt of meetingTimesCS101A) {
        const classDate = getStartOfWeekISO(fall2024StartDate, mt.dayOfWeek);
        const startTime = new Date(classDate);
        startTime.setUTCHours(mt.startHour, mt.startMinute, 0, 0);
        const endTime = new Date(classDate);
        endTime.setUTCHours(mt.endHour, mt.endMinute, 0, 0);

        await run(
          "INSERT INTO schedules (sectionId, startTime, endTime, roomNumber) VALUES (?, ?, ?, ?)",
          [
            cs101FallA_sectionId,
            startTime.toISOString(),
            endTime.toISOString(),
            mt.room,
          ]
        );
      }
      logger.info(`Scheduled meetings for CS101-Fall 2024-A inserted.`);
    }

    // 7. Seed Student Enrollments
    if (userIds.student1 && cs101FallA_sectionId) {
      await run(
        "INSERT INTO student_section_enrollments (studentUserId, sectionId) VALUES (?, ?)",
        [userIds.student1, cs101FallA_sectionId]
      );
      logger.info(`Student student1 enrolled in CS101-Fall 2024-A.`);
    }
    const ma101FallA_sectionId = sectionIds["MA101-Fall 2024-A"];
    if (userIds.student1 && ma101FallA_sectionId) {
      await run(
        "INSERT INTO student_section_enrollments (studentUserId, sectionId) VALUES (?, ?)",
        [userIds.student1, ma101FallA_sectionId]
      );
      logger.info(`Student student1 enrolled in MA101-Fall 2024-A.`);
    }

    // 8. Seed Messages
    if (userIds.admin && userIds.student1 && facultyUserIds.faculty1) {
      const messages = [
        {
          senderId: userIds.admin,
          subject: "Welcome!",
          content: "Welcome to the new ERP system.",
          type: "Broadcast",
          priority: "Normal" as const,
        },
        {
          senderId: facultyUserIds.faculty1,
          receiverId: userIds.student1,
          subject: "CS101 Assignment",
          content: "Details for the first CS101 assignment are now available.",
          type: "Direct",
          priority: "Urgent" as const,
        },
      ];
      for (const message of messages) {
        await run(
          "INSERT INTO messages (senderId, receiverId, subject, content, type, priority) VALUES (?, ?, ?, ?, ?, ?)",
          [
            message.senderId,
            message.receiverId,
            message.subject,
            message.content,
            message.type,
            message.priority,
          ]
        );
      }
      logger.info(`Sample messages inserted.`);
    }

    logger.info("Database seeding completed successfully.");
  } catch (error) {
    const err = error as Error;
    logger.error("Error seeding database:", err.message, err.stack);
  } finally {
    if (require.main === module) {
      dbDefault.close((err) => {
        if (err) {
          logger.error(
            "Error closing database connection after seeding:",
            err.message
          );
        } else {
          logger.info("Database connection closed after seeding.");
        }
      });
    }
  }
};

if (require.main === module) {
  seedDatabase();
}
