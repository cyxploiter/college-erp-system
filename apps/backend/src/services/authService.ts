
import bcrypt from 'bcryptjs';
import { get } from '@/db/db';
import { User, UserPayload, LoginResponse, UserRole } from '@college-erp/common';
import { generateToken } from '@/utils/jwt';
import { HttpError } from '@/middleware/errorHandler';
import logger from '@/utils/logger';
import { config } from '@/config'; 

const determineUserRole = async (userId: string): Promise<UserRole | null> => {
  // userId is now a string (e.g., A1234, F5678, 20250001)
  // We can infer from prefixes or query role tables. Querying is more robust.
  if (await get('SELECT userId FROM students WHERE userId = ?', [userId])) return 'student';
  if (await get('SELECT userId FROM faculty WHERE userId = ?', [userId])) return 'faculty';
  if (await get('SELECT userId FROM admins WHERE userId = ?', [userId])) return 'admin';
  if (await get('SELECT userId FROM superusers WHERE userId = ?', [userId])) return 'superuser';
  logger.warn(`Could not determine role for userId: ${userId}`);
  return null;
};

export const loginUser = async (rawIdentifier: string, pass: string): Promise<LoginResponse> => {
  const identifier = rawIdentifier.trim();
  logger.info(`Attempting login for identifier: "${identifier}"`);

  let userId: string | undefined;
  let userFromDb: User | undefined;

  // Try to find user by direct ID match first (identifier might be A1234, F5678, 2025..., SU...)
  userFromDb = await get<User>('SELECT id, name, passwordHash, email, profilePictureUrl, departmentId FROM users WHERE id = ?', [identifier]);

  if (userFromDb) {
    userId = userFromDb.id;
    logger.debug(`Identifier "${identifier}" matched a direct user ID: ${userId}`);
  } else {
    // If not a direct ID match, try as email
    logger.debug(`Identifier "${identifier}" not a direct user ID, checking as email.`);
    userFromDb = await get<User>('SELECT id, name, passwordHash, email, profilePictureUrl, departmentId FROM users WHERE email = ?', [identifier]);
    if (userFromDb) {
      userId = userFromDb.id;
      logger.debug(`Identifier "${identifier}" (email) resolved to user ID: ${userId}`);
    } else {
      logger.warn(`Login attempt: Identifier "${identifier}" not found as ID or email.`);
    }
  }

  if (!userId || !userFromDb) {
    logger.warn(`Login failed: Identifier "${identifier}" not found.`);
    throw new HttpError('Invalid identifier or password.', 401);
  }

  if (!userFromDb.passwordHash) {
    logger.warn(`Login failed: User record for ID ${userId} (from identifier "${identifier}") missing password hash.`);
    throw new HttpError('Invalid identifier or password.', 401);
  }

  const isPasswordValid = await bcrypt.compare(pass, userFromDb.passwordHash);
  if (!isPasswordValid) {
    logger.warn(`Login failed: Invalid password for user ${userFromDb.name} (ID: ${userFromDb.id}, Identifier: "${identifier}").`);
    throw new HttpError('Invalid identifier or password.', 401);
  }

  const actualRole = await determineUserRole(userFromDb.id);
  if (!actualRole) {
    logger.error(`Login failed: Role could not be determined for user ${userFromDb.name} (ID: ${userFromDb.id}). This indicates a data integrity issue.`);
    throw new HttpError('User account is not correctly configured. Please contact admin.', 500);
  }
  
  // Fetch student-specific details if user is a student, to populate program and branch in UserPayload
  let studentProgram: string | undefined;
  let studentBranch: string | undefined;
  if (actualRole === 'student') {
      const studentDetails = await get<{ program?: string, branch?: string }>(
          'SELECT program, branch FROM students WHERE userId = ?', 
          [userFromDb.id]
      );
      if (studentDetails) {
          studentProgram = studentDetails.program;
          studentBranch = studentDetails.branch;
      }
  }

  const userPayload: UserPayload = {
    id: userFromDb.id,
    name: userFromDb.name, 
    role: actualRole,
    email: userFromDb.email,
    profilePictureUrl: userFromDb.profilePictureUrl, 
    departmentId: userFromDb.departmentId,
    studentRegistrationId: actualRole === 'student' ? userFromDb.id : undefined, // user.id is the studentRegistrationId
    program: studentProgram,
    branch: studentBranch,
  };

  const token = generateToken(userPayload);
  logger.info(`User ${userFromDb.name} (ID: ${userFromDb.id}, Role: ${actualRole}, Identifier: "${identifier}") logged in successfully.`);
  
  return { token, user: userPayload };
};