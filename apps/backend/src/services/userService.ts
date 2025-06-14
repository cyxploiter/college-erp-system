import bcrypt from 'bcryptjs';
import { get, all, run } from '@/db/db';
import { 
    User, UserPayload, UserRole, 
    StudentDetail, FacultyDetail, AdminDetail, SuperuserDetail, 
    Department, UserProfileResponse,
    CreateUserInput, UpdateUserInput, StudentEnrollment
} from '@college-erp/common';
import { HttpError } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

const _determineUserRole = async (userId: string): Promise<UserRole | null> => {
  if (await get('SELECT userId FROM students WHERE userId = ?', [userId])) return 'student';
  if (await get('SELECT userId FROM faculty WHERE userId = ?', [userId])) return 'faculty';
  if (await get('SELECT userId FROM admins WHERE userId = ?', [userId])) return 'admin';
  if (await get('SELECT userId FROM superusers WHERE userId = ?', [userId])) return 'superuser';
  return null;
};

const generateUniqueIdLogic = async (prefix: string, numNumericDigits: number): Promise<string> => {
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
        const existing = await get('SELECT 1 FROM users WHERE id = ?', [id]); // Check in users.id
        if (!existing) {
        isUnique = true;
        }
        attempts++;
    }
    if (!isUnique) {
        throw new HttpError(`Failed to generate unique ID for users table with prefix ${prefix} after ${maxAttempts} attempts.`, 500);
    }
    return id!;
};

const generateStudentId = async (): Promise<string> => {
    return generateUniqueIdLogic('2025', 6); // Example student ID logic: 2025 + 6 random digits
};
const generateFacultyId = async (): Promise<string> => {
    return generateUniqueIdLogic('F', 4);
};
const generateAdminId = async (): Promise<string> => {
    return generateUniqueIdLogic('A', 4);
};
const generateSuperuserId = async (): Promise<string> => {
    return generateUniqueIdLogic('SU', 4);
};


export const getUserProfileById = async (userId: string): Promise<UserProfileResponse> => {
  logger.debug(`Fetching profile for user ID: ${userId}`);
  const user = await get<User & { deptName?: string }>(
    `SELECT u.id, u.name, u.email, u.profilePictureUrl, u.departmentId, u.createdAt, u.updatedAt, d.name as deptName 
     FROM users u 
     LEFT JOIN departments d ON u.departmentId = d.id 
     WHERE u.id = ?`, [userId]
  );

  if (!user) {
    logger.warn(`User profile not found for ID: ${userId}`);
    throw new HttpError('User not found.', 404);
  }
  
  const role = await _determineUserRole(user.id);
  if (!role) {
     logger.error(`User profile fetch failed: Role not found for user ${user.name} (ID: ${user.id}).`);
     throw new HttpError('User account is not fully configured.', 500);
  }

  let studentDetails: StudentDetail | undefined;
  let facultyDetails: FacultyDetail | undefined;
  let adminDetails: Omit<AdminDetail, 'userId'> | undefined;
  let superuserDetails: Omit<SuperuserDetail, 'userId'> | undefined;
  let facultyDepartment: Department | undefined;

  if (role === 'student') {
    studentDetails = await get<StudentDetail>('SELECT * FROM students WHERE userId = ?', [userId]);
    if (studentDetails) {
        const enrollments = await all<StudentEnrollment>('SELECT sectionId FROM student_section_enrollments WHERE studentUserId = ?', [userId]);
        studentDetails.enrolledSectionIds = enrollments.map(e => e.sectionId);
    }
  } else if (role === 'faculty') {
    const facultyDbResult = await get<FacultyDetail & { facultyDeptName?: string }>(
        `SELECT f.*, d.name as facultyDeptName 
         FROM faculty f
         JOIN departments d ON f.departmentId = d.id
         WHERE f.userId = ?`, [userId]);
    if (facultyDbResult) {
        facultyDetails = facultyDbResult; // Direct assignment as FacultyDetail includes all necessary fields
        const assignedSections = await all<{ id: number }>('SELECT id FROM sections WHERE facultyUserId = ?', [userId]);
        facultyDetails.assignedSectionIds = assignedSections.map(s => s.id);
        facultyDepartment = { id: facultyDbResult.departmentId, name: facultyDbResult.facultyDeptName || 'N/A', createdAt: '', updatedAt: '' };
    }
  } else if (role === 'admin') {
    adminDetails = await get<Omit<AdminDetail, 'userId'>>('SELECT id, permissionLevel, createdAt, updatedAt FROM admins WHERE userId = ?', [userId]);
  } else if (role === 'superuser') {
    superuserDetails = await get<Omit<SuperuserDetail, 'userId'>>('SELECT id, permissions, createdAt, updatedAt FROM superusers WHERE userId = ?', [userId]);
  }
  
  const userProfileResponse: UserProfileResponse = {
      id: user.id,
      name: user.name,
      role: role,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,
      departmentId: user.departmentId, 
      department: user.departmentId && user.deptName ? { id: user.departmentId, name: user.deptName, createdAt: '', updatedAt: ''} : undefined,
      studentDetails, // Now includes enrolledSectionIds
      facultyDetails, // Now includes assignedSectionIds
      adminDetails,
      superuserDetails,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      studentRegistrationId: role === 'student' ? user.id : undefined,
      facultyEmployeeId: role === 'faculty' ? user.id : undefined,
      adminEmployeeId: role === 'admin' ? user.id : undefined,
      superuserEmployeeId: role === 'superuser' ? user.id : undefined,
      program: role === 'student' ? studentDetails?.program : undefined,
      branch: role === 'student' ? studentDetails?.branch : undefined,
  };

  if (role === 'faculty' && facultyDepartment) {
    userProfileResponse.department = facultyDepartment;
    userProfileResponse.departmentId = facultyDepartment.id;
  }

  logger.info(`Profile fetched for user ${user.name} (ID: ${userId}, Role: ${role})`);
  return userProfileResponse;
};


export const createUser = async (data: CreateUserInput): Promise<UserPayload> => {
  logger.info(`Attempting to create user: ${data.name} with role ${data.role}`);
  const { 
    name, email, profilePictureUrl, password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY, role, 
    departmentId, 
    program, branch, expectedGraduationYear, currentYearOfStudy, gpa, academicStatus,
    fatherName, motherName, dateOfBirth, phoneNumber, permanentAddress, currentAddress,
    enrolledSectionIds, // New
    officeNumber, specialization, assignedSectionIds, // New
    permissionLevel, 
    superuserPermissions 
  } = data;

  const existingUserByEmail = await get<User>('SELECT id FROM users WHERE email = ?', [email]);
  if (existingUserByEmail) {
    logger.warn(`User creation failed: Email ${email} already exists.`);
    throw new HttpError('Email already exists.', 409);
  }

  let newUserId: string;
  switch (role) {
    case 'student': newUserId = await generateStudentId(); break;
    case 'faculty': newUserId = await generateFacultyId(); break;
    case 'admin': newUserId = await generateAdminId(); break;
    case 'superuser': newUserId = await generateSuperuserId(); break;
    default: throw new HttpError('Invalid role specified for ID generation.', 400);
  }
  
  const existingUserById = await get<User>('SELECT id FROM users WHERE id = ?', [newUserId]);
  if (existingUserById) {
      logger.error(`User creation failed: Generated ID ${newUserId} already exists. This should be rare.`);
      throw new HttpError('Failed to generate a unique user ID. Please try again.', 500);
  }

  const passwordHash = await bcrypt.hash(password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY, 10);
  const userDepartmentIdForUsersTable = (role === 'faculty' && departmentId) ? departmentId : (departmentId || null);

  await run(
    'INSERT INTO users (id, name, email, passwordHash, profilePictureUrl, departmentId) VALUES (?, ?, ?, ?, ?, ?)',
    [newUserId, name, email, passwordHash, profilePictureUrl, userDepartmentIdForUsersTable]
  );

  try {
    if (role === 'student') {
      await run(
        `INSERT INTO students (userId, enrollmentDate, program, branch, 
                               expectedGraduationYear, currentYearOfStudy, gpa, academicStatus, 
                               fatherName, motherName, dateOfBirth, phoneNumber, permanentAddress, currentAddress) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [
          newUserId, new Date().toISOString(), program, branch,
          expectedGraduationYear, currentYearOfStudy, gpa, academicStatus,
          fatherName, motherName, dateOfBirth, phoneNumber, permanentAddress, currentAddress
        ]
      );
      if (enrolledSectionIds && enrolledSectionIds.length > 0) {
        for (const sectionId of enrolledSectionIds) {
          await run('INSERT INTO student_section_enrollments (studentUserId, sectionId) VALUES (?, ?)', [newUserId, sectionId]);
        }
      }
      logger.info(`Student ${name} created with userId ${newUserId}.`);
    } else if (role === 'faculty') {
      if (!departmentId) throw new HttpError('Department ID is required for faculty role details.', 400);
      await run('INSERT INTO faculty (userId, departmentId, officeNumber, specialization) VALUES (?, ?, ?, ?)', 
        [newUserId, departmentId, officeNumber, specialization]);
      if (assignedSectionIds && assignedSectionIds.length > 0) {
        for (const sectionId of assignedSectionIds) {
          // Check if section is already assigned? For now, we overwrite.
          await run('UPDATE sections SET facultyUserId = ? WHERE id = ?', [newUserId, sectionId]);
        }
      }
      logger.info(`Faculty ${name} created with userId ${newUserId}.`);
    } else if (role === 'admin') {
      await run('INSERT INTO admins (userId, permissionLevel) VALUES (?, ?)', 
        [newUserId, permissionLevel]);
      logger.info(`Admin ${name} created with userId ${newUserId}.`);
    } else if (role === 'superuser') {
        await run('INSERT INTO superusers (userId, permissions) VALUES (?, ?)',
            [newUserId, superuserPermissions || '{}']);
        logger.info(`Superuser ${name} created with userId ${newUserId}.`);
    }
  } catch (roleError) {
    await run('DELETE FROM users WHERE id = ?', [newUserId]); 
    logger.error(`Failed to insert into role-specific table or handle sections for user ${newUserId}. User creation rolled back. Error: ${(roleError as Error).message}`);
    throw roleError; 
  }
  
  const newUserPayload: UserPayload = { 
    id: newUserId, name, email, profilePictureUrl, role, 
    departmentId: userDepartmentIdForUsersTable,
    studentRegistrationId: role === 'student' ? newUserId : undefined,
    program: role === 'student' ? program : undefined,
    branch: role === 'student' ? branch : undefined,
  };
  logger.info(`User ${name} created successfully with ID ${newUserId} and role ${role}.`);
  return newUserPayload;
};

export const getAllUsers = async (): Promise<UserPayload[]> => {
  logger.debug('Fetching all users for admin view.');
  const usersWithDetails = await all<User & { roleFromDb: UserRole, studentProgram?: string, studentBranch?: string }>(`
    SELECT
      u.id, u.name, u.email, u.profilePictureUrl, u.departmentId, u.createdAt, u.updatedAt,
      COALESCE(
        CASE WHEN su.userId IS NOT NULL THEN 'superuser' END,
        CASE WHEN s.userId IS NOT NULL THEN 'student' END,
        CASE WHEN f.userId IS NOT NULL THEN 'faculty' END,
        CASE WHEN a.userId IS NOT NULL THEN 'admin' END
      ) as roleFromDb, 
      s.program as studentProgram,
      s.branch as studentBranch
    FROM users u
    LEFT JOIN students s ON u.id = s.userId
    LEFT JOIN faculty f ON u.id = f.userId
    LEFT JOIN admins a ON u.id = a.userId
    LEFT JOIN superusers su ON u.id = su.userId
    ORDER BY u.name ASC 
  `);

  return usersWithDetails.map(user => ({
    id: user.id,
    name: user.name,
    role: user.roleFromDb, 
    email: user.email,
    profilePictureUrl: user.profilePictureUrl,
    departmentId: user.departmentId,
    studentRegistrationId: user.roleFromDb === 'student' ? user.id : undefined,
    program: user.roleFromDb === 'student' ? user.studentProgram : undefined,
    branch: user.roleFromDb === 'student' ? user.studentBranch : undefined,
  }));
};

export const getUserById = async (userId: string): Promise<UserPayload | null> => { 
  logger.debug(`Admin fetching user by ID: ${userId}`);
  const userBasic = await get<User>(
    `SELECT u.id, u.name, u.email, u.profilePictureUrl, u.departmentId FROM users u WHERE u.id = ?`, [userId]
    );

  if (!userBasic) {
    logger.warn(`Admin fetch: User not found for ID: ${userId}`);
    return null;
  }
  const role = await _determineUserRole(userId);
  if (!role) {
    logger.warn(`Admin fetch: Role not found for user ID: ${userId}.`);
    return null; 
  }

  let studentProgram: string | undefined;
  let studentBranch: string | undefined;
  if (role === 'student') {
      const studentData = await get<{program?: string, branch?: string}>('SELECT program, branch FROM students WHERE userId = ?', [userId]);
      studentProgram = studentData?.program;
      studentBranch = studentData?.branch;
  }

  return {
    id: userBasic.id,
    name: userBasic.name,
    role: role,
    email: userBasic.email,
    profilePictureUrl: userBasic.profilePictureUrl,
    departmentId: userBasic.departmentId,
    studentRegistrationId: role === 'student' ? userBasic.id : undefined,
    program: studentProgram,
    branch: studentBranch,
  };
};

export const updateUserById = async (userId: string, data: UpdateUserInput): Promise<UserPayload> => {
  logger.info(`Attempting to update user ID: ${userId}`);
  
  const currentUserProfile = await getUserProfileById(userId); 
  if (!currentUserProfile) {
    throw new HttpError('User not found.', 404);
  }
  const currentRole = currentUserProfile.role; 

  const { 
    name, email, profilePictureUrl, departmentId, 
    program, branch, expectedGraduationYear, currentYearOfStudy, gpa, academicStatus,
    fatherName, motherName, dateOfBirth, phoneNumber, permanentAddress, currentAddress,
    enrolledSectionIds, // New
    officeNumber, specialization, assignedSectionIds, // New
    permissionLevel, 
    superuserPermissions 
  } = data;


  if (email && email !== currentUserProfile.email) {
    const existingUserByEmail = await get<User>('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existingUserByEmail) throw new HttpError('Email already taken.', 409);
  }
  
  const fieldsToUpdateUsers: string[] = [];
  const valuesUsers: (string | number | null | undefined)[] = [];

  if (name !== undefined) { fieldsToUpdateUsers.push('name = ?'); valuesUsers.push(name); }
  if (email !== undefined) { fieldsToUpdateUsers.push('email = ?'); valuesUsers.push(email); }
  if (profilePictureUrl !== undefined) { fieldsToUpdateUsers.push('profilePictureUrl = ?'); valuesUsers.push(profilePictureUrl); }
  
  if (departmentId !== undefined && currentRole !== 'faculty') { 
     fieldsToUpdateUsers.push('departmentId = ?'); valuesUsers.push(departmentId); 
  }

  if (fieldsToUpdateUsers.length > 0) {
    valuesUsers.push(userId);
    const sql = `UPDATE users SET ${fieldsToUpdateUsers.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await run(sql, valuesUsers);
  }

  if (currentRole === 'student') {
    const fields: string[] = [], values: any[] = [];
    if (program !== undefined) { fields.push('program = ?'); values.push(program); }
    if (branch !== undefined) { fields.push('branch = ?'); values.push(branch); }
    // ... other student fields ...
    if (expectedGraduationYear !== undefined) { fields.push('expectedGraduationYear = ?'); values.push(expectedGraduationYear); }
    if (currentYearOfStudy !== undefined) { fields.push('currentYearOfStudy = ?'); values.push(currentYearOfStudy); }
    if (gpa !== undefined) { fields.push('gpa = ?'); values.push(gpa); }
    if (academicStatus !== undefined) { fields.push('academicStatus = ?'); values.push(academicStatus); }
    if (fatherName !== undefined) { fields.push('fatherName = ?'); values.push(fatherName); }
    if (motherName !== undefined) { fields.push('motherName = ?'); values.push(motherName); }
    if (dateOfBirth !== undefined) { fields.push('dateOfBirth = ?'); values.push(dateOfBirth); }
    if (phoneNumber !== undefined) { fields.push('phoneNumber = ?'); values.push(phoneNumber); }
    if (permanentAddress !== undefined) { fields.push('permanentAddress = ?'); values.push(permanentAddress); }
    if (currentAddress !== undefined) { fields.push('currentAddress = ?'); values.push(currentAddress); }

    if (fields.length > 0) {
      values.push(userId);
      await run(`UPDATE students SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`, values);
    }
    // Handle enrolledSectionIds for students
    if (enrolledSectionIds !== undefined) {
        const currentEnrollments = (await all<StudentEnrollment>('SELECT sectionId FROM student_section_enrollments WHERE studentUserId = ?', [userId])).map(e => e.sectionId);
        const sectionsToAdd = enrolledSectionIds.filter(id => !currentEnrollments.includes(id));
        const sectionsToRemove = currentEnrollments.filter(id => !enrolledSectionIds.includes(id));

        for (const sectionId of sectionsToAdd) {
            await run('INSERT INTO student_section_enrollments (studentUserId, sectionId) VALUES (?, ?)', [userId, sectionId]);
        }
        if (sectionsToRemove.length > 0) {
            const placeholders = sectionsToRemove.map(() => '?').join(',');
            await run(`DELETE FROM student_section_enrollments WHERE studentUserId = ? AND sectionId IN (${placeholders})`, [userId, ...sectionsToRemove]);
        }
    }
  } else if (currentRole === 'faculty') {
    const fields: string[] = [], values: any[] = [];
    if (departmentId !== undefined) { 
        fields.push('departmentId = ?'); values.push(departmentId); 
        await run('UPDATE users SET departmentId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [departmentId, userId]);
    }
    if (officeNumber !== undefined) { fields.push('officeNumber = ?'); values.push(officeNumber); }
    if (specialization !== undefined) { fields.push('specialization = ?'); values.push(specialization); }
    if (fields.length > 0) {
      values.push(userId);
      await run(`UPDATE faculty SET ${fields.join(', ')}, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`, values);
    }
    // Handle assignedSectionIds for faculty
    if (assignedSectionIds !== undefined) {
        // Unassign faculty from sections they are no longer assigned to
        await run('UPDATE sections SET facultyUserId = NULL, updatedAt = CURRENT_TIMESTAMP WHERE facultyUserId = ? AND id NOT IN (' + (assignedSectionIds.length > 0 ? assignedSectionIds.map(() => '?').join(',') : 'NULL') + ')', [userId, ...assignedSectionIds]);
        // Assign faculty to new sections
        for (const sectionId of assignedSectionIds) {
            await run('UPDATE sections SET facultyUserId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [userId, sectionId]);
        }
    }
  } else if (currentRole === 'admin' && permissionLevel !== undefined) {
    await run('UPDATE admins SET permissionLevel = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?', [permissionLevel, userId]);
  } else if (currentRole === 'superuser' && superuserPermissions !== undefined) {
    await run('UPDATE superusers SET permissions = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?', [superuserPermissions, userId]);
  }

  const updatedUserPayload = await getUserById(userId); 
  if (!updatedUserPayload) {
    logger.error(`Failed to retrieve updated user details for ID: ${userId} post-update.`);
    throw new HttpError('User updated, but failed to fetch updated details.', 500);
  }
  logger.info(`User ID: ${userId} updated successfully. Current role ${updatedUserPayload.role}.`);
  return updatedUserPayload;
};

export const deleteUserById = async (userId: string): Promise<void> => {
  logger.info(`Attempting to delete user ID: ${userId}`);
  const user = await get<User>('SELECT id FROM users WHERE id = ?', [userId]);
  if (!user) {
    logger.warn(`Delete failed: User ${userId} not found.`);
    throw new HttpError('User not found.', 404);
  }

  const result = await run('DELETE FROM users WHERE id = ?', [userId]);
  if (result.changes === 0) {
    logger.warn(`Delete operation for user ID: ${userId} resulted in no changes. User might have been deleted already.`);
  }
  // For faculty, ensure sections they taught are unassigned
  await run('UPDATE sections SET facultyUserId = NULL WHERE facultyUserId = ?', [userId]);
  logger.info(`User ID: ${userId} deleted successfully. Corresponding role entries also deleted via cascade. Sections unassigned if faculty.`);
};

export const getAllDepartments = async (): Promise<Department[]> => {
    logger.debug('Fetching all departments.');
    return await all<Department>('SELECT id, name, createdAt, updatedAt FROM departments ORDER BY name ASC');
};