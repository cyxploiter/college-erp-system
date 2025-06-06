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
      id TEXT PRIMARY KEY NOT NULL, -- Changed from INTEGER PRIMARY KEY AUTOINCREMENT
      name TEXT NOT NULL,
      passwordHash TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      profilePictureUrl TEXT,
      departmentId INTEGER, 
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (departmentId) REFERENCES departments (id) ON DELETE SET NULL
    );
  `;

  const createStudentsTable = `
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT, -- Internal ID for the student_details row
      userId TEXT UNIQUE NOT NULL, -- Changed from INTEGER, links to users.id
      -- studentRegistrationId TEXT UNIQUE NOT NULL, -- REMOVED (now users.id)
      enrollmentDate DATETIME,
      program TEXT, 
      branch TEXT, 
      expectedGraduationYear INTEGER, 
      currentYearOfStudy INTEGER, 
      gpa REAL, 
      academicStatus TEXT, 
      fatherName TEXT, 
      motherName TEXT, 
      dateOfBirth DATE, 
      phoneNumber TEXT, 
      permanentAddress TEXT, 
      currentAddress TEXT, 
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createFacultyTable = `
    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT, -- Internal ID
      userId TEXT UNIQUE NOT NULL, -- Changed from INTEGER, links to users.id
      -- facultyEmployeeId TEXT UNIQUE NOT NULL, -- REMOVED (now users.id)
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
      id INTEGER PRIMARY KEY AUTOINCREMENT, -- Internal ID
      userId TEXT UNIQUE NOT NULL, -- Changed from INTEGER, links to users.id
      -- adminEmployeeId TEXT UNIQUE NOT NULL, -- REMOVED (now users.id)
      permissionLevel TEXT, 
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createSuperusersTable = `
    CREATE TABLE IF NOT EXISTS superusers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, -- Internal ID
      userId TEXT UNIQUE NOT NULL, -- Changed from INTEGER, links to users.id
      -- superuserEmployeeId TEXT UNIQUE NOT NULL, -- REMOVED (now users.id)
      permissions TEXT, -- JSON string for specific permissions
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createCoursesTable = `
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      courseCode TEXT UNIQUE NOT NULL, 
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
      name TEXT UNIQUE NOT NULL, 
      year INTEGER NOT NULL,
      term TEXT NOT NULL, 
      startDate DATE NOT NULL,
      endDate DATE NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSectionsTable = `
    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sectionCode TEXT NOT NULL, 
      courseId INTEGER NOT NULL,
      semesterId INTEGER NOT NULL,
      facultyUserId TEXT, -- Changed from INTEGER, links to users.id
      roomNumber TEXT, 
      maxCapacity INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (courseId) REFERENCES courses (id) ON DELETE CASCADE,
      FOREIGN KEY (semesterId) REFERENCES semesters (id) ON DELETE CASCADE,
      FOREIGN KEY (facultyUserId) REFERENCES users (id) ON DELETE SET NULL,
      UNIQUE (courseId, semesterId, sectionCode)
    );
  `;

  const createSchedulesTable = `
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sectionId INTEGER NOT NULL,
      startTime DATETIME NOT NULL, 
      endTime DATETIME NOT NULL,   
      roomNumber TEXT, 
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sectionId) REFERENCES sections (id) ON DELETE CASCADE
    );
  `;

  const createStudentEnrollmentsTable = `
    CREATE TABLE IF NOT EXISTS student_section_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentUserId TEXT NOT NULL, -- Changed from INTEGER, links to users.id
      sectionId INTEGER NOT NULL,
      enrollmentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      grade TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (studentUserId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (sectionId) REFERENCES sections (id) ON DELETE CASCADE,
      UNIQUE (studentUserId, sectionId) 
    );
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senderId TEXT, -- Changed from INTEGER, links to users.id (can be null)
      receiverId TEXT, -- Changed from INTEGER, links to users.id (can be null)
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
        execLog(createSuperusersTable, "superusers");
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
          "superusers",
          "courses",
          "semesters",
          "sections",
          "schedules",
          "student_section_enrollments",
          "messages",
        ];
        let triggersCreated = 0;
        tablesForTriggers.forEach((table) => {
          // The 'id' column in users is TEXT, but trigger condition `WHERE id = OLD.id` should still work.
          execLog(
            createUpdatedAtTrigger(table),
            `${table} updatedAt trigger`,
            () => {
              triggersCreated++;
              if (triggersCreated === tablesForTriggers.length) {
                db.exec("SELECT 1", (err) => {
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
