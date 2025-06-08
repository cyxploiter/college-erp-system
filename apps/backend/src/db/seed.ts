
import dbDefault, { run, get, all } from './db';
import bcrypt from 'bcryptjs';
import logger from '@/utils/logger';
import { Department, UserRole, Course, Semester, Section, User } from '@college-erp/common';
import { departmentToBranchAbbr, getSemesterAbbrFromDetails } from '@/utils/sectionCodeHelper'; // Import helpers

// Declare Node.js globals for TypeScript
declare const require: any;
declare const module: any;

const getStartOfWeekISO = (date: Date, dayOfWeek: number) => { 
  const d = new Date(date);
  const currentDay = d.getDay();
  const diff = d.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + dayOfWeek; 
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const generateUniqueIdWithNumericSuffix = async (prefix: string, numNumericDigits: number): Promise<string> => {
  let id;
  let isUnique = false;
  const maxAttempts = 50; 
  let attempts = 0;

  while (!isUnique && attempts < maxAttempts) {
    let randomSuffix = '';
    for (let i = 0; i < numNumericDigits; i++) {
      randomSuffix += Math.floor(Math.random() * 10).toString();
    }
    id = `${prefix}${randomSuffix}`;
    
    const existing = await get('SELECT 1 FROM users WHERE id = ?', [id]);
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }
  if (!isUnique) {
    throw new Error(`Failed to generate unique ID for users table with prefix ${prefix} after ${maxAttempts} attempts.`);
  }
  return id!;
};

const generateUniqueStudentId = async (): Promise<string> => {
    let studentId;
    let isUnique = false;
    const maxAttempts = 50;
    let attempts = 0;
    while(!isUnique && attempts < maxAttempts) {
        let randomSuffix = '';
        for (let i = 0; i < 6; i++) {
            randomSuffix += Math.floor(Math.random() * 10).toString();
        }
        studentId = `2025${randomSuffix}`;
        const existing = await get('SELECT 1 FROM users WHERE id = ?', [studentId]);
        if (!existing) {
            isUnique = true;
        }
        attempts++;
    }
    if (!isUnique) {
        throw new Error(`Failed to generate unique student ID for users table after ${maxAttempts} attempts.`);
    }
    return studentId!;
};

// Moved to sectionCodeHelper.ts: departmentToBranchAbbr
// Moved to sectionCodeHelper.ts: getSemesterAbbr (now getSemesterAbbrFromDetails)


const seedDatabase = async () => {
  logger.info('Starting database seeding...');

  try {
    const departmentNames = ['Computer Science', 'Mathematics', 'Physics', 'History', 'General Administration'];
    const departmentIds: { [name: string]: number } = {};
    for (const name of departmentNames) {
      try {
        const result = await run('INSERT INTO departments (name) VALUES (?)', [name]);
        departmentIds[name] = result.lastID;
        logger.info(`Department '${name}' inserted with ID ${result.lastID}.`);
      } catch (error) {
        const existingDept = await get<Department>('SELECT id FROM departments WHERE name = ?', [name]);
        if (existingDept) departmentIds[name] = existingDept.id;
        logger.warn(`Department '${name}' already exists with ID ${departmentIds[name]}. Skipping insertion.`);
      }
    }

    const usersToSeed = [
      { name: 'Super User', password: 'password123', email: 'superuser@example.com', profilePictureUrl: null, role: 'superuser' as UserRole, departmentName: null, permissions: JSON.stringify({ canManageAll: true }) },
      { name: 'Admin User', password: 'password123', email: 'admin@example.com', profilePictureUrl: null, role: 'admin' as UserRole, departmentName: 'General Administration', permissionLevel: 'full_access' },
      { 
        name: 'Student Alice', password: 'password123', email: 'student.alice@example.com', profilePictureUrl: null, role: 'student' as UserRole, 
        departmentName: 'Computer Science', 
        program: 'B.Tech', branch: 'Computer Science & Engineering', 
        expectedGraduationYear: 2027, currentYearOfStudy: 1, gpa: null, academicStatus: 'Good Standing',
        fatherName: 'John Doe', motherName: 'Jane Doe', dateOfBirth: '2005-06-15', phoneNumber: '9876543210',
        permanentAddress: '123 Main St, Anytown, India', currentAddress: 'Room 101, Hostel A, College Campus'
      },
      { 
        name: 'Student Bob', password: 'password123', email: 'student.bob@example.com', profilePictureUrl: null, role: 'student' as UserRole, 
        departmentName: 'Mathematics',
        program: 'B.Sc.', branch: 'Mathematics',
        expectedGraduationYear: 2026, currentYearOfStudy: 2, gpa: 3.8, academicStatus: 'Good Standing',
        fatherName: 'Robert Smith', motherName: 'Susan Smith', dateOfBirth: '2004-02-20', phoneNumber: '8765432109',
        permanentAddress: '456 Oak Ave, Othercity, India', currentAddress: 'Room 202, Hostel B, College Campus'
      },
      { name: 'Faculty Carol', password: 'password123', email: 'faculty.carol@example.com', profilePictureUrl: null, role: 'faculty' as UserRole, departmentName: 'Computer Science', office: 'CS-101', spec: 'AI' },
      { name: 'Faculty David', password: 'password123', email: 'faculty.david@example.com', profilePictureUrl: null, role: 'faculty' as UserRole, departmentName: 'Mathematics', office: 'MA-205', spec: 'Algebra' },
    ];
    const userStringIds: { [name: string]: string } = {}; 
    
    for (const userData of usersToSeed) {
      const passwordHash = await bcrypt.hash(userData.password, 10);
      const userPrimaryDepartmentId = userData.departmentName ? departmentIds[userData.departmentName] : null;
      
      let currentUserId: string; 

      try {
        if (userData.role === 'student') {
            currentUserId = await generateUniqueStudentId();
        } else if (userData.role === 'faculty') {
            currentUserId = await generateUniqueIdWithNumericSuffix('F', 4);
        } else if (userData.role === 'admin') {
            currentUserId = await generateUniqueIdWithNumericSuffix('A', 4);
        } else if (userData.role === 'superuser') {
            currentUserId = await generateUniqueIdWithNumericSuffix('SU', 4);
        } else {
            currentUserId = await generateUniqueIdWithNumericSuffix('U', 6); 
        }
        
        await run(
          'INSERT INTO users (id, name, passwordHash, email, profilePictureUrl, departmentId) VALUES (?, ?, ?, ?, ?, ?)',
          [currentUserId, userData.name, passwordHash, userData.email, userData.profilePictureUrl, userPrimaryDepartmentId]
        );
        userStringIds[userData.name] = currentUserId; 
        logger.info(`User ${userData.name} inserted with ID ${currentUserId}.`);

        if (userData.role === 'student') {
          await run(
            `INSERT INTO students (userId, enrollmentDate, program, branch, 
                                   expectedGraduationYear, currentYearOfStudy, gpa, academicStatus,
                                   fatherName, motherName, dateOfBirth, phoneNumber, permanentAddress, currentAddress) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
            [
              currentUserId, new Date().toISOString(), userData.program, userData.branch,
              userData.expectedGraduationYear, userData.currentYearOfStudy, userData.gpa, userData.academicStatus,
              userData.fatherName, userData.motherName, userData.dateOfBirth, userData.phoneNumber, 
              userData.permanentAddress, userData.currentAddress
            ]
          );
          logger.info(`Student ${userData.name} details inserted with userId ${currentUserId}.`);
        } else if (userData.role === 'faculty') {
          const facultyDeptIdForFacultyTable = departmentIds[userData.departmentName!];
          if (!facultyDeptIdForFacultyTable) {
             logger.error(`Faculty ${userData.name} department '${userData.departmentName}' not found. Skipping faculty details.`);
             continue;
          }
          await run('INSERT INTO faculty (userId, departmentId, officeNumber, specialization) VALUES (?, ?, ?, ?)', 
                    [currentUserId, facultyDeptIdForFacultyTable, userData.office, userData.spec]);
          logger.info(`Faculty ${userData.name} details inserted with userId ${currentUserId}.`);
        } else if (userData.role === 'admin') {
          await run('INSERT INTO admins (userId, permissionLevel) VALUES (?, ?)', 
                    [currentUserId, userData.permissionLevel || 'full_access']);
          logger.info(`Admin ${userData.name} details inserted with userId ${currentUserId}.`);
        } else if (userData.role === 'superuser') {
            await run('INSERT INTO superusers (userId, permissions) VALUES (?, ?)',
                      [currentUserId, userData.permissions || '{}']);
            logger.info(`Superuser ${userData.name} details inserted with userId ${currentUserId}.`);
        }
      } catch (error) {
        const existingUser = await get<User>('SELECT id FROM users WHERE email = ?', [userData.email]);
        if (existingUser) {
            userStringIds[userData.name] = existingUser.id; 
        }
        logger.warn(`User email ${userData.email} might already exist, or error during ID generation/insertion. ID: ${userStringIds[userData.name]}. Error: ${(error as Error).message}`);
      }
    }
    
    for (const u of usersToSeed) {
        if (!userStringIds[u.name]) {
            const existing = await get<User>('SELECT id FROM users WHERE email = ?', [u.email]);
            if (existing) {
                userStringIds[u.name] = existing.id;
            }
        }
    }

    const semestersToSeedData = [ // Renamed to avoid conflict with Semester type
      { name: 'Odd 2024', year: 2024, term: 'Odd' as Semester['term'], startDate: '2024-07-15', endDate: '2024-12-05' },
      { name: 'Even 2025', year: 2025, term: 'Even' as Semester['term'], startDate: '2025-01-10', endDate: '2025-05-30' },
    ];
    const semesterIds: { [name: string]: number } = {};
    const semesterDetailsById: { [id: number]: { name: string, year: number, term: string } } = {}; // For section code generation

    for (const sem of semestersToSeedData) {
      try {
        const result = await run('INSERT INTO semesters (name, year, term, startDate, endDate) VALUES (?, ?, ?, ?, ?)', 
                                 [sem.name, sem.year, sem.term, sem.startDate, sem.endDate]);
        semesterIds[sem.name] = result.lastID;
        semesterDetailsById[result.lastID] = { name: sem.name, year: sem.year, term: sem.term };
        logger.info(`Semester '${sem.name}' inserted.`);
      } catch (error) {
        const existingSem = await get<Semester>('SELECT id, year, term FROM semesters WHERE name = ?', [sem.name]); // Fetch year and term
        if (existingSem) {
            semesterIds[sem.name] = existingSem.id;
            semesterDetailsById[existingSem.id] = { name: existingSem.name, year: existingSem.year, term: existingSem.term };
        }
        logger.warn(`Semester '${sem.name}' already exists. Skipping.`);
      }
    }

    const coursesToSeed = [
      { courseCode: 'CS101', courseName: 'Intro to Programming', departmentName: 'Computer Science', credits: 3 },
      { courseCode: 'CS301', courseName: 'Advanced Algorithms', departmentName: 'Computer Science', credits: 3 },
      { courseCode: 'MA101', courseName: 'Calculus I', departmentName: 'Mathematics', credits: 4 },
      { courseCode: 'PY101', courseName: 'General Physics I', departmentName: 'Physics', credits: 4 },
    ];
    const courseIds: { [code: string]: number } = {};
    const courseDetailsById: { [id: number]: { departmentName: string } } = {}; // For section code generation

    for (const course of coursesToSeed) {
      try {
        const result = await run('INSERT INTO courses (courseCode, courseName, departmentId, credits) VALUES (?, ?, ?, ?)',
                                 [course.courseCode, course.courseName, departmentIds[course.departmentName], course.credits]);
        courseIds[course.courseCode] = result.lastID;
        courseDetailsById[result.lastID] = { departmentName: course.departmentName };
        logger.info(`Course '${course.courseCode}' inserted.`);
      } catch (error) {
        const existingCourse = await get<Course>('SELECT id FROM courses WHERE courseCode = ?', [course.courseCode]);
        if (existingCourse) {
            courseIds[course.courseCode] = existingCourse.id;
            // Assuming course.departmentName is available if existingCourse is found
            courseDetailsById[existingCourse.id] = { departmentName: course.departmentName }; 
        }
        logger.warn(`Course '${course.courseCode}' already exists. Skipping.`);
      }
    }
    
    const sectionsToSeed = [
      { sectionLetter: 'A', courseCode: 'CS101', semesterName: 'Odd 2024', facultyNameKey: 'Faculty Carol', room: 'CS-R1' },
      { sectionLetter: 'B', courseCode: 'CS101', semesterName: 'Odd 2024', facultyNameKey: 'Faculty Carol', room: 'CS-R2' },
      { sectionLetter: 'A', courseCode: 'MA101', semesterName: 'Odd 2024', facultyNameKey: 'Faculty David', room: 'MA-R1' },
    ];
    const sectionIds: { [key: string]: number } = {}; 
    const defaultSectionCapacity = 60; // Schema default will handle this, but explicit for clarity

     for (const sec of sectionsToSeed) {
      const keyForMap = `${sec.courseCode}-${sec.semesterName}-${sec.sectionLetter}`;
      
      try {
        const currentCourseId = courseIds[sec.courseCode];
        const currentCourseDetails = courseDetailsById[currentCourseId];
        if (!currentCourseDetails) {
            logger.error(`Course details for ${sec.courseCode} (ID: ${currentCourseId}) not found. Skipping section.`);
            continue;
        }
        
        const currentSemesterId = semesterIds[sec.semesterName];
        const currentSemesterDetails = semesterDetailsById[currentSemesterId];
         if (!currentSemesterDetails) {
            logger.error(`Semester details for ${sec.semesterName} (ID: ${currentSemesterId}) not found. Skipping section.`);
            continue;
        }

        const branchAbbr = departmentToBranchAbbr[currentCourseDetails.departmentName] || 'GN';
        const semesterAbbr = getSemesterAbbrFromDetails(currentSemesterDetails.term, currentSemesterDetails.year); // Use helper
        const finalSectionCode = `${branchAbbr}${semesterAbbr}${sec.sectionLetter.toUpperCase()}`;

        const facultyIdToAssign = userStringIds[sec.facultyNameKey]; 
        if (!facultyIdToAssign && sec.facultyNameKey) { 
            logger.warn(`Faculty ${sec.facultyNameKey} not found (string ID map) for section ${finalSectionCode}, skipping faculty assignment.`);
        }
        
        const result = await run(
            'INSERT INTO sections (sectionCode, courseId, semesterId, facultyUserId, roomNumber, maxCapacity) VALUES (?, ?, ?, ?, ?, ?)',
            [finalSectionCode, currentCourseId, currentSemesterId, facultyIdToAssign, sec.room, defaultSectionCapacity]
        );
        sectionIds[keyForMap] = result.lastID;
        logger.info(`Section ${finalSectionCode} (key: ${keyForMap}) inserted with ID ${result.lastID}, Capacity: ${defaultSectionCapacity}.`);
      } catch (error) {
        const currentSemesterId = semesterIds[sec.semesterName];
        const currentSemesterDetails = semesterDetailsById[currentSemesterId];
        const semesterAbbrForQuery = currentSemesterDetails ? getSemesterAbbrFromDetails(currentSemesterDetails.term, currentSemesterDetails.year) : 'XX';


         const existingSection = await get<Section>(
            `SELECT s.id FROM sections s 
             JOIN courses c ON s.courseId = c.id
             JOIN semesters sem ON s.semesterId = sem.id
             WHERE c.courseCode = ? AND sem.name = ? AND s.sectionCode LIKE '%' || ?`, 
            [sec.courseCode, sec.semesterName, `${semesterAbbrForQuery}${sec.sectionLetter.toUpperCase()}`]
        );
        if (existingSection) sectionIds[keyForMap] = existingSection.id;
        logger.warn(`Section for course ${sec.courseCode}, semester ${sec.semesterName}, letter ${sec.sectionLetter} might already exist or error. Skipping. Error: ${(error as Error).message}`);
      }
    }

    const cs101Odd2024A_sectionId = sectionIds['CS101-Odd 2024-A'];
    if (cs101Odd2024A_sectionId) {
      const odd2024StartDate = new Date(semestersToSeedData.find(s=>s.name === 'Odd 2024')!.startDate + 'T00:00:00Z');
      const meetingTimesCS101A = [
        { dayOfWeek: 1, startHour: 9, startMinute: 0, endHour: 10, endMinute: 30, room: 'CS-R1A' }, 
        { dayOfWeek: 3, startHour: 9, startMinute: 0, endHour: 10, endMinute: 30, room: 'CS-R1A' },
      ];
      for (const mt of meetingTimesCS101A) {
        const classDate = getStartOfWeekISO(odd2024StartDate, mt.dayOfWeek);
        const startTime = new Date(classDate);
        startTime.setUTCHours(mt.startHour, mt.startMinute, 0, 0);
        const endTime = new Date(classDate);
        endTime.setUTCHours(mt.endHour, mt.endMinute, 0, 0);

        await run('INSERT INTO schedules (sectionId, startTime, endTime, roomNumber) VALUES (?, ?, ?, ?)',
                  [cs101Odd2024A_sectionId, startTime.toISOString(), endTime.toISOString(), mt.room]);
      }
      logger.info(`Scheduled meetings for CS101-Odd 2024-A inserted.`);
    }

    const studentAliceId = userStringIds['Student Alice']; 
    if (studentAliceId && cs101Odd2024A_sectionId) {
      await run('INSERT INTO student_section_enrollments (studentUserId, sectionId) VALUES (?, ?)', [studentAliceId, cs101Odd2024A_sectionId]);
      logger.info(`Student Alice enrolled in section ID ${cs101Odd2024A_sectionId} (CS101-Odd 2024-A).`);
    }
    
    const ma101Odd2024A_sectionId = sectionIds['MA101-Odd 2024-A'];
    if (studentAliceId && ma101Odd2024A_sectionId) {
      await run('INSERT INTO student_section_enrollments (studentUserId, sectionId) VALUES (?, ?)', [studentAliceId, ma101Odd2024A_sectionId]);
      logger.info(`Student Alice enrolled in section ID ${ma101Odd2024A_sectionId} (MA101-Odd 2024-A).`);
    }

    const superUserId = userStringIds['Super User'];
    const adminUserId = userStringIds['Admin User'];
    const facultyCarolId = userStringIds['Faculty Carol']; 

    if (superUserId && studentAliceId && facultyCarolId && adminUserId) {
      const messages = [
        { senderId: superUserId, subject: 'System Maintenance Alert', content: 'System will be down for maintenance tonight from 2 AM to 3 AM.', type: 'Broadcast', priority: 'Critical' as const },
        { senderId: adminUserId, subject: 'Welcome!', content: 'Welcome to the new ERP system.', type: 'Broadcast', priority: 'Normal' as const },
        { senderId: facultyCarolId, receiverId: studentAliceId, subject: 'CS101 Assignment', content: 'Details for the first CS101 assignment are now available.', type: 'Direct', priority: 'Urgent' as const },
      ];
      for (const message of messages) {
        await run(
          'INSERT INTO messages (senderId, receiverId, subject, content, type, priority) VALUES (?, ?, ?, ?, ?, ?)',
          [message.senderId, message.receiverId, message.subject, message.content, message.type, message.priority]
        );
      }
      logger.info(`Sample messages inserted.`);
    }

    logger.info('Database seeding completed successfully.');

  } catch (error) {
    const err = error as Error;
    logger.error('Error seeding database:', err.message, err.stack);
  } finally {
    if (require.main === module) {
        dbDefault.close((err) => {
          if (err) {
            logger.error('Error closing database connection after seeding:', err.message);
          } else {
            logger.info('Database connection closed after seeding.');
          }
        });
    }
  }
};

if (require.main === module) {
  seedDatabase();
}
