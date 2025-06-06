import dbDefault, { run, get, all } from "./db";
import bcrypt from "bcryptjs";
import logger from "@/utils/logger";
import {
  Department,
  UserRole,
  Course,
  Semester,
  Section,
  User,
} from "@college-erp/common";

// Declare Node.js globals for TypeScript
declare const require: any;
declare const module: any;

const getStartOfWeekISO = (date: Date, dayOfWeek: number) => {
  const d = new Date(date);
  const currentDay = d.getDay();
  const diff =
    d.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + dayOfWeek;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const generateUniqueIdWithNumericSuffix = async (
  prefix: string,
  numNumericDigits: number
): Promise<string> => {
  let id;
  let isUnique = false;
  const maxAttempts = 50; // Increased attempts for potentially denser ID space
  let attempts = 0;

  while (!isUnique && attempts < maxAttempts) {
    let randomSuffix = "";
    for (let i = 0; i < numNumericDigits; i++) {
      randomSuffix += Math.floor(Math.random() * 10).toString();
    }
    id = `${prefix}${randomSuffix}`;

    // Check uniqueness in users.id table
    const existing = await get("SELECT 1 FROM users WHERE id = ?", [id]);
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  if (!isUnique) {
    throw new Error(
      `Failed to generate unique ID for users table with prefix ${prefix} after ${maxAttempts} attempts.`
    );
  }
  return id!;
};

const generateUniqueStudentId = async (): Promise<string> => {
  // For students, ID format is '2025' + 6 digits.
  // We need to ensure the 6-digit part is unique enough to avoid collisions in users.id.
  let studentId;
  let isUnique = false;
  const maxAttempts = 50;
  let attempts = 0;
  while (!isUnique && attempts < maxAttempts) {
    let randomSuffix = "";
    for (let i = 0; i < 6; i++) {
      randomSuffix += Math.floor(Math.random() * 10).toString();
    }
    studentId = `2025${randomSuffix}`;
    const existing = await get("SELECT 1 FROM users WHERE id = ?", [studentId]);
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  if (!isUnique) {
    throw new Error(
      `Failed to generate unique student ID for users table after ${maxAttempts} attempts.`
    );
  }
  return studentId!;
};

const seedDatabase = async () => {
  logger.info("Starting database seeding...");

  try {
    const departmentNames = [
      "Computer Science",
      "Mathematics",
      "Physics",
      "History",
      "General Administration",
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

    const usersToSeed = [
      {
        name: "Super User",
        password: "password123",
        email: "superuser@example.com",
        profilePictureUrl: null,
        role: "superuser" as UserRole,
        departmentName: null,
        permissions: JSON.stringify({ canManageAll: true }),
      },
      {
        name: "Admin User",
        password: "password123",
        email: "admin@example.com",
        profilePictureUrl: null,
        role: "admin" as UserRole,
        departmentName: "General Administration",
        permissionLevel: "full_access",
      },
      {
        name: "Student Alice",
        password: "password123",
        email: "student.alice@example.com",
        profilePictureUrl: null,
        role: "student" as UserRole,
        departmentName: "Computer Science",
        program: "B.Tech",
        branch: "Computer Science & Engineering",
        expectedGraduationYear: 2027,
        currentYearOfStudy: 1,
        gpa: null,
        academicStatus: "Good Standing",
        fatherName: "John Doe",
        motherName: "Jane Doe",
        dateOfBirth: "2005-06-15",
        phoneNumber: "9876543210",
        permanentAddress: "123 Main St, Anytown, India",
        currentAddress: "Room 101, Hostel A, College Campus",
      },
      {
        name: "Student Bob",
        password: "password123",
        email: "student.bob@example.com",
        profilePictureUrl: null,
        role: "student" as UserRole,
        departmentName: "Mathematics",
        program: "B.Sc.",
        branch: "Mathematics",
        expectedGraduationYear: 2026,
        currentYearOfStudy: 2,
        gpa: 3.8,
        academicStatus: "Good Standing",
        fatherName: "Robert Smith",
        motherName: "Susan Smith",
        dateOfBirth: "2004-02-20",
        phoneNumber: "8765432109",
        permanentAddress: "456 Oak Ave, Othercity, India",
        currentAddress: "Room 202, Hostel B, College Campus",
      },
      {
        name: "Faculty Carol",
        password: "password123",
        email: "faculty.carol@example.com",
        profilePictureUrl: null,
        role: "faculty" as UserRole,
        departmentName: "Computer Science",
        office: "CS-101",
        spec: "AI",
      },
      {
        name: "Faculty David",
        password: "password123",
        email: "faculty.david@example.com",
        profilePictureUrl: null,
        role: "faculty" as UserRole,
        departmentName: "Mathematics",
        office: "MA-205",
        spec: "Algebra",
      },
    ];
    const userStringIds: { [name: string]: string } = {}; // Stores the generated string ID for users

    for (const userData of usersToSeed) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      const userPrimaryDepartmentId = userData.departmentName
        ? departmentIds[userData.departmentName]
        : null;

      let currentUserId: string; // This will be the string ID (e.g., A1234, F5678, 20250001)

      try {
        // Generate role-specific ID which will be users.id
        if (userData.role === "student") {
          currentUserId = await generateUniqueStudentId();
        } else if (userData.role === "faculty") {
          currentUserId = await generateUniqueIdWithNumericSuffix("F", 4);
        } else if (userData.role === "admin") {
          currentUserId = await generateUniqueIdWithNumericSuffix("A", 4);
        } else if (userData.role === "superuser") {
          currentUserId = await generateUniqueIdWithNumericSuffix("SU", 4);
        } else {
          // Fallback for any other role or if role is misconfigured, though unlikely with UserRole type
          currentUserId = await generateUniqueIdWithNumericSuffix("U", 6);
        }

        // Insert into users table using the generated string ID
        await run(
          "INSERT INTO users (id, name, passwordHash, email, profilePictureUrl, departmentId) VALUES (?, ?, ?, ?, ?, ?)",
          [
            currentUserId,
            userData.name,
            passwordHash,
            userData.email,
            userData.profilePictureUrl,
            userPrimaryDepartmentId,
          ]
        );
        userStringIds[userData.name] = currentUserId; // Store the string ID
        logger.info(`User ${userData.name} inserted with ID ${currentUserId}.`);

        // Insert into role-specific tables
        if (userData.role === "student") {
          await run(
            `INSERT INTO students (userId, enrollmentDate, program, branch, 
                                   expectedGraduationYear, currentYearOfStudy, gpa, academicStatus,
                                   fatherName, motherName, dateOfBirth, phoneNumber, permanentAddress, currentAddress) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              currentUserId,
              new Date().toISOString(),
              userData.program,
              userData.branch,
              userData.expectedGraduationYear,
              userData.currentYearOfStudy,
              userData.gpa,
              userData.academicStatus,
              userData.fatherName,
              userData.motherName,
              userData.dateOfBirth,
              userData.phoneNumber,
              userData.permanentAddress,
              userData.currentAddress,
            ]
          );
          logger.info(
            `Student ${userData.name} details inserted with userId ${currentUserId}.`
          );
        } else if (userData.role === "faculty") {
          const facultyDeptIdForFacultyTable =
            departmentIds[userData.departmentName!];
          if (!facultyDeptIdForFacultyTable) {
            logger.error(
              `Faculty ${userData.name} department '${userData.departmentName}' not found. Skipping faculty details.`
            );
            continue;
          }
          await run(
            "INSERT INTO faculty (userId, departmentId, officeNumber, specialization) VALUES (?, ?, ?, ?)",
            [
              currentUserId,
              facultyDeptIdForFacultyTable,
              userData.office,
              userData.spec,
            ]
          );
          logger.info(
            `Faculty ${userData.name} details inserted with userId ${currentUserId}.`
          );
        } else if (userData.role === "admin") {
          await run(
            "INSERT INTO admins (userId, permissionLevel) VALUES (?, ?)",
            [currentUserId, userData.permissionLevel || "full_access"]
          );
          logger.info(
            `Admin ${userData.name} details inserted with userId ${currentUserId}.`
          );
        } else if (userData.role === "superuser") {
          await run(
            "INSERT INTO superusers (userId, permissions) VALUES (?, ?)",
            [currentUserId, userData.permissions || "{}"]
          );
          logger.info(
            `Superuser ${userData.name} details inserted with userId ${currentUserId}.`
          );
        }
      } catch (error) {
        const existingUser = await get<User>(
          "SELECT id FROM users WHERE email = ?",
          [userData.email]
        );
        if (existingUser) {
          userStringIds[userData.name] = existingUser.id; // Store the existing string ID
        }
        logger.warn(
          `User email ${
            userData.email
          } might already exist, or error during ID generation/insertion. ID: ${
            userStringIds[userData.name]
          }. Error: ${(error as Error).message}`
        );
      }
    }

    // Ensure all userStringIds are populated if they existed previously
    for (const u of usersToSeed) {
      if (!userStringIds[u.name]) {
        const existing = await get<User>(
          "SELECT id FROM users WHERE email = ?",
          [u.email]
        );
        if (existing) {
          userStringIds[u.name] = existing.id;
        }
      }
    }

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

    const sectionsToSeed = [
      {
        sectionCode: "A",
        courseCode: "CS101",
        semesterName: "Fall 2024",
        facultyNameKey: "Faculty Carol",
        room: "CS-R1",
        cap: 30,
      },
      {
        sectionCode: "B",
        courseCode: "CS101",
        semesterName: "Fall 2024",
        facultyNameKey: "Faculty Carol",
        room: "CS-R2",
        cap: 30,
      },
      {
        sectionCode: "A",
        courseCode: "MA101",
        semesterName: "Fall 2024",
        facultyNameKey: "Faculty David",
        room: "MA-R1",
        cap: 35,
      },
    ];
    const sectionIds: { [key: string]: number } = {};
    for (const sec of sectionsToSeed) {
      const key = `${sec.courseCode}-${sec.semesterName}-${sec.sectionCode}`;
      try {
        const facultyIdToAssign = userStringIds[sec.facultyNameKey]; // Use string ID map
        if (!facultyIdToAssign && sec.facultyNameKey) {
          logger.warn(
            `Faculty ${sec.facultyNameKey} not found (string ID map) for section ${key}, skipping faculty assignment.`
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

    const studentAliceId = userStringIds["Student Alice"]; // Use string ID
    if (studentAliceId && cs101FallA_sectionId) {
      await run(
        "INSERT INTO student_section_enrollments (studentUserId, sectionId) VALUES (?, ?)",
        [studentAliceId, cs101FallA_sectionId]
      );
      logger.info(`Student Alice enrolled in CS101-Fall 2024-A.`);
    }
    const ma101FallA_sectionId = sectionIds["MA101-Fall 2024-A"];
    if (studentAliceId && ma101FallA_sectionId) {
      await run(
        "INSERT INTO student_section_enrollments (studentUserId, sectionId) VALUES (?, ?)",
        [studentAliceId, ma101FallA_sectionId]
      );
      logger.info(`Student Alice enrolled in MA101-Fall 2024-A.`);
    }

    const superUserId = userStringIds["Super User"];
    const adminUserId = userStringIds["Admin User"];
    const facultyCarolId = userStringIds["Faculty Carol"]; // Faculty IDs are now string IDs from userStringIds

    if (superUserId && studentAliceId && facultyCarolId && adminUserId) {
      const messages = [
        {
          senderId: superUserId,
          subject: "System Maintenance Alert",
          content:
            "System will be down for maintenance tonight from 2 AM to 3 AM.",
          type: "Broadcast",
          priority: "Critical" as const,
        },
        {
          senderId: adminUserId,
          subject: "Welcome!",
          content: "Welcome to the new ERP system.",
          type: "Broadcast",
          priority: "Normal" as const,
        },
        {
          senderId: facultyCarolId,
          receiverId: studentAliceId,
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
