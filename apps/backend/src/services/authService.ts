import bcrypt from "bcryptjs";
import { get } from "@/db/db";
import {
  User,
  UserPayload,
  LoginResponse,
  UserRole,
} from "@college-erp/common";
import { generateToken } from "@/utils/jwt";
import { HttpError } from "@/middleware/errorHandler";
import logger from "@/utils/logger";

// Helper function to determine user role remains useful for verification
const determineUserRole = async (userId: number): Promise<UserRole | null> => {
  const isStudent = await get("SELECT userId FROM students WHERE userId = ?", [
    userId,
  ]);
  if (isStudent) return "student";
  const isFaculty = await get("SELECT userId FROM faculty WHERE userId = ?", [
    userId,
  ]);
  if (isFaculty) return "faculty";
  const isAdmin = await get("SELECT userId FROM admins WHERE userId = ?", [
    userId,
  ]);
  if (isAdmin) return "admin";
  return null;
};

export const loginUser = async (
  identifier: string,
  pass: string
): Promise<LoginResponse> => {
  logger.info(`Attempting login for identifier: ${identifier}`);
  let userId: number | undefined;
  let determinedRole: UserRole | null = null;

  // Detect ID type and fetch userId
  if (identifier.startsWith("2025") && identifier.length === 10) {
    const student = await get<{ userId: number }>(
      "SELECT userId FROM students WHERE studentRegistrationId = ?",
      [identifier]
    );
    if (student) {
      userId = student.userId;
      determinedRole = "student";
    }
  } else if (identifier.startsWith("1") && identifier.length === 5) {
    const faculty = await get<{ userId: number }>(
      "SELECT userId FROM faculty WHERE facultyEmployeeId = ?",
      [identifier]
    );
    if (faculty) {
      userId = faculty.userId;
      determinedRole = "faculty";
    }
  } else if (identifier.startsWith("2") && identifier.length === 5) {
    const admin = await get<{ userId: number }>(
      "SELECT userId FROM admins WHERE adminEmployeeId = ?",
      [identifier]
    );
    if (admin) {
      userId = admin.userId;
      determinedRole = "admin";
    }
  }

  if (!userId) {
    logger.warn(
      `Login failed: Identifier ${identifier} not found or format is incorrect.`
    );
    throw new HttpError("Invalid identifier or password.", 401);
  }

  // Fetch user from the 'users' table using the resolved userId
  const user = await get<User>(
    "SELECT id, username, passwordHash, email, departmentId FROM users WHERE id = ?",
    [userId]
  );

  if (!user || !user.passwordHash) {
    logger.warn(
      `Login failed: User record not found for resolved userId ${userId} or password hash missing.`
    );
    throw new HttpError("Invalid identifier or password.", 401); // Keep generic message for security
  }

  const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
  if (!isPasswordValid) {
    logger.warn(
      `Login failed: Invalid password for user linked to identifier ${identifier} (User ID: ${user.id}).`
    );
    throw new HttpError("Invalid identifier or password.", 401);
  }

  // Verify determinedRole matches the one from DB associations as a sanity check
  const actualRole = await determineUserRole(user.id);
  if (!actualRole || (determinedRole && actualRole !== determinedRole)) {
    logger.error(
      `Login failed: Role mismatch or not found for user ${user.username} (ID: ${user.id}). Expected ${determinedRole}, got ${actualRole}.`
    );
    throw new HttpError(
      "User account is not correctly configured. Please contact admin.",
      500
    );
  }

  const userPayload: UserPayload = {
    id: user.id,
    username: user.username, // Keep username in payload for display/greeting
    role: actualRole,
    email: user.email,
    departmentId: user.departmentId,
  };

  const token = generateToken(userPayload);
  logger.info(
    `User ${user.username} (ID: ${user.id}, Role: ${actualRole}, Identifier: ${identifier}) logged in successfully.`
  );

  return { token, user: userPayload };
};
