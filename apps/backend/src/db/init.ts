import db from "./db"; // Import the opened db connection
import logger from "@/utils/logger";

// Declare Node.js globals for TypeScript
declare const require: any;
declare const module: any;

const createSchema = async () => {
  logger.info("Starting database schema initialization...");

  const createDepartmentsTable = `
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      departmentId INTEGER, 
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (departmentId) REFERENCES departments (id) ON DELETE SET NULL
    );
  `;

  const createStudentsTable = `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      studentRegistrationId TEXT UNIQUE NOT NULL, -- New Field
      enrollmentDate DATETIME,
      major TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createFacultyTable = `
    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      facultyEmployeeId TEXT UNIQUE NOT NULL, -- New Field
      departmentId INTEGER NOT NULL, 
      officeNumber TEXT,
      specialization TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (departmentId) REFERENCES departments (id) ON DELETE RESTRICT
    );
  `;

  const createAdminsTable = `
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER UNIQUE NOT NULL,
      adminEmployeeId TEXT UNIQUE NOT NULL, -- New Field
      permissionLevel TEXT, 
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  // New Tables for Enhanced Scheduling
  const createCoursesTable = `
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courseCode TEXT UNIQUE NOT NULL, -- e.g., CS101
      courseName TEXT NOT NULL,
      departmentId INTEGER NOT NULL,
      credits INTEGER,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (departmentId) REFERENCES departments (id) ON DELETE CASCADE
    );
  `;

  const createSemestersTable = `
    CREATE TABLE IF NOT EXISTS semesters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL, -- e.g., "Fall 2024"
      year INTEGER NOT NULL,
      term TEXT NOT NULL, -- e.g., "Fall", "Spring", "1"
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSectionsTable = `
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sectionCode TEXT NOT NULL, -- e.g., "A", "001"
      courseId INTEGER NOT NULL,
      semesterId INTEGER NOT NULL,
      facultyUserId INTEGER, -- User ID of the faculty teaching this section
      roomNumber TEXT, -- Default room for the section
      maxCapacity INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (courseId) REFERENCES courses (id) ON DELETE CASCADE,
      FOREIGN KEY (semesterId) REFERENCES semesters (id) ON DELETE CASCADE,
      FOREIGN KEY (facultyUserId) REFERENCES users (id) ON DELETE SET NULL,
      UNIQUE (courseId, semesterId, sectionCode) -- A course section is unique within a semester
    );
  `;

  // Modified Schedules Table: Represents individual meeting times for a section
  const createSchedulesTable = `
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sectionId INTEGER NOT NULL,
      startTime DATETIME NOT NULL, -- Full date and time of the class meeting
      endTime DATETIME NOT NULL,   -- Full date and time
      roomNumber TEXT, -- Specific room for this meeting, can override section's default
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sectionId) REFERENCES sections (id) ON DELETE CASCADE
    );
  `;

  const createStudentEnrollmentsTable = `
    CREATE TABLE IF NOT EXISTS student_section_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentUserId INTEGER NOT NULL,
      sectionId INTEGER NOT NULL,
      enrollmentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      grade TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studentUserId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (sectionId) REFERENCES sections (id) ON DELETE CASCADE,
      UNIQUE (studentUserId, sectionId) -- Student can enroll in a section only once
    );
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senderId INTEGER, 
      receiverId INTEGER, 
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      priority TEXT CHECK(priority IN ('Normal', 'Urgent', 'Critical')) DEFAULT 'Normal',
      type TEXT CHECK(type IN ('Broadcast', 'Direct')) NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      isRead BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (senderId) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (receiverId) REFERENCES users (id) ON DELETE SET NULL
    );
  `;

  const createUpdatedAtTrigger = (tableName: string) => `
    CREATE TRIGGER IF NOT EXISTS update_${tableName}_updatedAt
    AFTER UPDATE ON ${tableName}
    FOR EACH ROW
    BEGIN
      UPDATE ${tableName} SET updatedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `;

  try {
    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        const execLog = (
          sql: string,
          tableName: string,
          cb?: (err: Error | null) => void
        ) => {
          db.exec(sql, (err) => {
            if (err)
              return reject(
                new Error(
                  `Failed to create/update ${tableName}: ${err.message}`
                )
              );
            logger.info(
              `${tableName} table/trigger created or already exists.`
            );
            if (cb) cb(null);
          });
        };

        execLog(createDepartmentsTable, "departments");
        execLog(createUsersTable, "users");
        execLog(createStudentsTable, "students");
        execLog(createFacultyTable, "faculty");
        execLog(createAdminsTable, "admins");
        execLog(createCoursesTable, "courses");
        execLog(createSemestersTable, "semesters");
        execLog(createSectionsTable, "sections");
        execLog(createSchedulesTable, "schedules (meetings)");
        execLog(createStudentEnrollmentsTable, "student_section_enrollments");
        execLog(createMessagesTable, "messages");

        const tablesForTriggers = [
          "users",
          "departments",
          "students",
          "faculty",
          "admins",
          "courses",
          "semesters",
          "sections",
          "schedules",
          "student_section_enrollments",
          "messages",
        ];
        let triggersCreated = 0;
        tablesForTriggers.forEach((table) => {
          execLog(
            createUpdatedAtTrigger(table),
            `${table} updatedAt trigger`,
            () => {
              triggersCreated++;
              if (triggersCreated === tablesForTriggers.length) {
                // This is the last operation in this block
                db.exec("SELECT 1", (err) => {
                  // Final dummy exec
                  if (err)
                    return reject(
                      new Error(`Finalizing schema error: ${err.message}`)
                    );
                  resolve();
                });
              }
            }
          );
        });
      });
    });
    logger.info("Database schema initialized successfully.");
  } catch (error) {
    const err = error as Error;
    logger.error("Error initializing database schema:", err.message);
    (process as any).exit(1);
  } finally {
    if (require.main === module) {
      db.close((err) => {
        if (err) {
          logger.error("Error closing database connection:", err.message);
        } else {
          logger.info(
            "Database connection closed after schema initialization."
          );
        }
      });
    }
  }
};

if (require.main === module) {
  createSchema();
}
