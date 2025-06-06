import bcrypt from "bcryptjs";
import { get, all, run } from "@/db/db";
import {
  User,
  UserPayload,
  UserRole,
  StudentDetail,
  FacultyDetail,
  AdminDetail,
  Department,
  UserProfileResponse,
} from "@college-erp/common";
import { HttpError } from "@/middleware/errorHandler";
import logger from "@/utils/logger";

export interface CreateUserInput {
  username: string;
  email: string;
  password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: string;
  role: UserRole;
  departmentId?: number | null;
  major?: string;
  officeNumber?: string;
  specialization?: string;
  permissionLevel?: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  role?: UserRole;
  departmentId?: number | null;
  major?: string;
  officeNumber?: string;
  specialization?: string;
  permissionLevel?: string;
}

const _determineUserRole = async (userId: number): Promise<UserRole | null> => {
  if (await get("SELECT userId FROM students WHERE userId = ?", [userId]))
    return "student";
  if (await get("SELECT userId FROM faculty WHERE userId = ?", [userId]))
    return "faculty";
  if (await get("SELECT userId FROM admins WHERE userId = ?", [userId]))
    return "admin";
  return null;
};

// Helper to generate unique random numeric employee ID
const generateUniqueEmployeeId = async (
  prefix: string,
  length: number,
  tableName: string,
  columnName: string
): Promise<string> => {
  let id;
  let isUnique = false;
  const maxAttempts = 10;
  let attempts = 0;
  while (!isUnique && attempts < maxAttempts) {
    // Generate a random number string of (length - prefix.length) digits
    const randomSuffix = Math.floor(
      Math.pow(10, length - prefix.length - 1) +
        Math.random() *
          (Math.pow(10, length - prefix.length) -
            Math.pow(10, length - prefix.length - 1) -
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
    throw new HttpError(
      `Failed to generate unique ${columnName} for ${tableName} after ${maxAttempts} attempts.`,
      500
    );
  }
  return id!;
};

export const getUserProfileById = async (
  userId: number
): Promise<UserProfileResponse> => {
  logger.debug(`Fetching profile for user ID: ${userId}`);
  const user = await get<User & { deptName?: string }>(
    `SELECT u.*, d.name as deptName 
     FROM users u 
     LEFT JOIN departments d ON u.departmentId = d.id 
     WHERE u.id = ?`,
    [userId]
  );

  if (!user) {
    logger.warn(`User profile not found for ID: ${userId}`);
    throw new HttpError("User not found.", 404);
  }

  const role = await _determineUserRole(user.id);
  if (!role) {
    logger.error(
      `User profile fetch failed: Role not found for user ${user.username} (ID: ${user.id}).`
    );
    throw new HttpError("User account is not fully configured.", 500);
  }

  let studentDetails: StudentDetail | undefined;
  let facultyDetails:
    | (FacultyDetail & { facultyDeptName?: string })
    | undefined;
  let adminDetails: AdminDetail | undefined;
  let facultyDepartment: Department | undefined;

  if (role === "student") {
    studentDetails = await get<StudentDetail>(
      "SELECT * FROM students WHERE userId = ?",
      [userId]
    );
  } else if (role === "faculty") {
    facultyDetails = await get<FacultyDetail & { facultyDeptName?: string }>(
      `SELECT f.*, d.name as facultyDeptName 
         FROM faculty f
         JOIN departments d ON f.departmentId = d.id
         WHERE f.userId = ?`,
      [userId]
    );
    if (facultyDetails) {
      facultyDepartment = {
        id: facultyDetails.departmentId,
        name: facultyDetails.facultyDeptName || "N/A",
        createdAt: "",
        updatedAt: "",
      };
    }
  } else if (role === "admin") {
    adminDetails = await get<AdminDetail>(
      "SELECT * FROM admins WHERE userId = ?",
      [userId]
    );
  }

  const userProfileResponse: UserProfileResponse = {
    id: user.id,
    username: user.username,
    role: role,
    email: user.email,
    departmentId: user.departmentId,
    department:
      user.departmentId && user.deptName
        ? {
            id: user.departmentId,
            name: user.deptName,
            createdAt: "",
            updatedAt: "",
          }
        : undefined,
    studentDetails,
    facultyDetails,
    adminDetails,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    // Include the formatted IDs
    studentRegistrationId:
      role === "student" ? studentDetails?.studentRegistrationId : undefined,
    facultyEmployeeId:
      role === "faculty" ? facultyDetails?.facultyEmployeeId : undefined,
    adminEmployeeId:
      role === "admin" ? adminDetails?.adminEmployeeId : undefined,
  };
  if (role === "faculty" && facultyDepartment) {
    userProfileResponse.department = facultyDepartment;
  }

  logger.info(
    `Profile fetched for user ${user.username} (ID: ${userId}, Role: ${role})`
  );
  return userProfileResponse;
};

export const createUser = async (
  data: CreateUserInput
): Promise<UserPayload> => {
  logger.info(
    `Attempting to create user: ${data.username} with role ${data.role}`
  );
  const {
    username,
    email,
    password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY,
    role,
    departmentId,
    major,
    officeNumber,
    specialization,
    permissionLevel,
  } = data;

  const existingUser = await get<User>(
    "SELECT id FROM users WHERE username = ? OR email = ?",
    [username, email]
  );
  if (existingUser) {
    logger.warn(
      `User creation failed: Username ${username} or email ${email} already exists.`
    );
    throw new HttpError("Username or email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(
    password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY,
    10
  );

  const userResult = await run(
    "INSERT INTO users (username, email, passwordHash, departmentId) VALUES (?, ?, ?, ?)",
    [username, email, passwordHash, role === "faculty" ? null : departmentId]
  );
  const newUserId = userResult.lastID;

  if (!newUserId) {
    logger.error(
      `User creation failed for ${username}, no lastID returned from users table insertion.`
    );
    throw new HttpError("Failed to create user base record.", 500);
  }

  try {
    if (role === "student") {
      // Generate studentRegistrationId based on student's own auto-incremented ID
      const studentInsertResult = await run(
        "INSERT INTO students (userId, studentRegistrationId, major, enrollmentDate) VALUES (?, ?, ?, ?)",
        [newUserId, "TEMP_ID", major, new Date().toISOString()]
      ); // Insert with a temporary ID
      const studentId = studentInsertResult.lastID;
      const studentRegistrationId = `2025${studentId
        .toString()
        .padStart(6, "0")}`;
      await run("UPDATE students SET studentRegistrationId = ? WHERE id = ?", [
        studentRegistrationId,
        studentId,
      ]);
      logger.info(
        `Student ${username} created with studentRegistrationId ${studentRegistrationId}.`
      );
    } else if (role === "faculty") {
      if (!departmentId)
        throw new HttpError("Department ID is required for faculty.", 400);
      const facultyEmployeeId = await generateUniqueEmployeeId(
        "1",
        5,
        "faculty",
        "facultyEmployeeId"
      );
      await run(
        "INSERT INTO faculty (userId, facultyEmployeeId, departmentId, officeNumber, specialization) VALUES (?, ?, ?, ?, ?)",
        [
          newUserId,
          facultyEmployeeId,
          departmentId,
          officeNumber,
          specialization,
        ]
      );
      logger.info(
        `Faculty ${username} created with facultyEmployeeId ${facultyEmployeeId}.`
      );
    } else if (role === "admin") {
      const adminEmployeeId = await generateUniqueEmployeeId(
        "2",
        5,
        "admins",
        "adminEmployeeId"
      );
      await run(
        "INSERT INTO admins (userId, adminEmployeeId, permissionLevel) VALUES (?, ?, ?)",
        [newUserId, adminEmployeeId, permissionLevel]
      );
      logger.info(
        `Admin ${username} created with adminEmployeeId ${adminEmployeeId}.`
      );
    } else {
      throw new HttpError("Invalid role specified.", 400);
    }
  } catch (roleError) {
    await run("DELETE FROM users WHERE id = ?", [newUserId]);
    logger.error(
      `Failed to insert into role-specific table for user ${newUserId}. User creation rolled back. Error: ${
        (roleError as Error).message
      }`
    );
    throw roleError;
  }

  const newUserPayload: UserPayload = {
    id: newUserId,
    username,
    email,
    role,
    departmentId: role === "faculty" ? departmentId : departmentId || null,
  };
  logger.info(
    `User ${username} created successfully with ID ${newUserId} and role ${role}.`
  );
  return newUserPayload;
};

export const getAllUsers = async (): Promise<UserPayload[]> => {
  logger.debug("Fetching all users for admin view.");
  const usersWithRoles = await all<User & { role: UserRole }>(`
    SELECT
      u.id, u.username, u.email, u.departmentId, u.createdAt, u.updatedAt,
      COALESCE(
        CASE WHEN s.userId IS NOT NULL THEN 'student' END,
        CASE WHEN f.userId IS NOT NULL THEN 'faculty' END,
        CASE WHEN a.userId IS NOT NULL THEN 'admin' END
      ) as role
    FROM users u
    LEFT JOIN students s ON u.id = s.userId
    LEFT JOIN faculty f ON u.id = f.userId
    LEFT JOIN admins a ON u.id = a.userId
    ORDER BY u.id ASC
  `);

  return usersWithRoles.map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    email: user.email,
    departmentId: user.departmentId,
  }));
};

export const getUserById = async (
  userId: number
): Promise<UserPayload | null> => {
  logger.debug(`Admin fetching user by ID: ${userId}`);
  const user = await get<User>(
    "SELECT id, username, email, departmentId, createdAt, updatedAt FROM users WHERE id = ?",
    [userId]
  );
  if (!user) {
    logger.warn(`Admin fetch: User not found for ID: ${userId}`);
    return null;
  }
  const role = await _determineUserRole(userId);
  if (!role) {
    logger.warn(`Admin fetch: Role not found for user ID: ${userId}.`);
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    role: role,
    email: user.email,
    departmentId: user.departmentId,
  };
};

export const updateUserById = async (
  userId: number,
  data: UpdateUserInput
): Promise<UserPayload> => {
  logger.info(
    `Attempting to update user ID: ${userId} with data: ${JSON.stringify(data)}`
  );

  const currentUserState = await getUserById(userId);
  if (!currentUserState) {
    throw new HttpError("User not found.", 404);
  }

  const {
    username,
    email,
    role: newRole,
    departmentId,
    major,
    officeNumber,
    specialization,
    permissionLevel,
  } = data;

  if (username && username !== currentUserState.username) {
    const existingUserByUsername = await get<User>(
      "SELECT id FROM users WHERE username = ? AND id != ?",
      [username, userId]
    );
    if (existingUserByUsername)
      throw new HttpError("Username already taken.", 409);
  }
  if (email && email !== currentUserState.email) {
    const existingUserByEmail = await get<User>(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, userId]
    );
    if (existingUserByEmail) throw new HttpError("Email already taken.", 409);
  }

  const fieldsToUpdateUsers: string[] = [];
  const valuesUsers: (string | number | null)[] = [];

  if (username !== undefined) {
    fieldsToUpdateUsers.push("username = ?");
    valuesUsers.push(username);
  }
  if (email !== undefined) {
    fieldsToUpdateUsers.push("email = ?");
    valuesUsers.push(email);
  }

  if (
    departmentId !== undefined &&
    newRole !== "faculty" &&
    (!newRole || newRole === currentUserState.role)
  ) {
    fieldsToUpdateUsers.push("departmentId = ?");
    valuesUsers.push(departmentId);
  }

  if (fieldsToUpdateUsers.length > 0) {
    valuesUsers.push(userId);
    const sql = `UPDATE users SET ${fieldsToUpdateUsers.join(
      ", "
    )}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`;
    await run(sql, valuesUsers);
  }

  if (newRole && newRole !== currentUserState.role) {
    logger.info(
      `Changing role for user ${userId} from ${currentUserState.role} to ${newRole}`
    );
    if (currentUserState.role === "student")
      await run("DELETE FROM students WHERE userId = ?", [userId]);
    else if (currentUserState.role === "faculty")
      await run("DELETE FROM faculty WHERE userId = ?", [userId]);
    else if (currentUserState.role === "admin")
      await run("DELETE FROM admins WHERE userId = ?", [userId]);

    // Re-create role specific entry with new details
    if (newRole === "student") {
      const studentInsertResult = await run(
        "INSERT INTO students (userId, studentRegistrationId, major) VALUES (?, ?, ?)",
        [userId, "TEMP_ID", major || null]
      );
      const studentId = studentInsertResult.lastID;
      const studentRegistrationId = `2025${studentId
        .toString()
        .padStart(6, "0")}`;
      await run("UPDATE students SET studentRegistrationId = ? WHERE id = ?", [
        studentRegistrationId,
        studentId,
      ]);
    } else if (newRole === "faculty") {
      if (departmentId === undefined || departmentId === null)
        throw new HttpError(
          "Department ID is required when changing role to faculty.",
          400
        );
      const facultyEmployeeId = await generateUniqueEmployeeId(
        "1",
        5,
        "faculty",
        "facultyEmployeeId"
      );
      await run(
        "INSERT INTO faculty (userId, facultyEmployeeId, departmentId, officeNumber, specialization) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          facultyEmployeeId,
          departmentId,
          officeNumber || null,
          specialization || null,
        ]
      );
    } else if (newRole === "admin") {
      const adminEmployeeId = await generateUniqueEmployeeId(
        "2",
        5,
        "admins",
        "adminEmployeeId"
      );
      await run(
        "INSERT INTO admins (userId, adminEmployeeId, permissionLevel) VALUES (?, ?, ?)",
        [userId, adminEmployeeId, permissionLevel || null]
      );
    }
  } else {
    // Update existing role-specific details if role is not changing
    if (currentUserState.role === "student" && major !== undefined) {
      await run(
        "UPDATE students SET major = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?",
        [major, userId]
      );
    } else if (currentUserState.role === "faculty") {
      const fieldsToUpdateFaculty: string[] = [];
      const valuesFaculty: (string | number | null)[] = [];
      if (departmentId !== undefined) {
        fieldsToUpdateFaculty.push("departmentId = ?");
        valuesFaculty.push(departmentId);
      }
      if (officeNumber !== undefined) {
        fieldsToUpdateFaculty.push("officeNumber = ?");
        valuesFaculty.push(officeNumber);
      }
      if (specialization !== undefined) {
        fieldsToUpdateFaculty.push("specialization = ?");
        valuesFaculty.push(specialization);
      }
      if (fieldsToUpdateFaculty.length > 0) {
        valuesFaculty.push(userId);
        await run(
          `UPDATE faculty SET ${fieldsToUpdateFaculty.join(
            ", "
          )}, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?`,
          valuesFaculty
        );
      }
    } else if (
      currentUserState.role === "admin" &&
      permissionLevel !== undefined
    ) {
      await run(
        "UPDATE admins SET permissionLevel = ?, updatedAt = CURRENT_TIMESTAMP WHERE userId = ?",
        [permissionLevel, userId]
      );
    }
  }

  const updatedUser = await getUserById(userId);
  if (!updatedUser) {
    logger.error(
      `Failed to retrieve updated user details for ID: ${userId} post-update.`
    );
    throw new HttpError(
      "User updated, but failed to fetch updated details.",
      500
    );
  }
  logger.info(
    `User ID: ${userId} updated successfully to role ${updatedUser.role}.`
  );
  return updatedUser;
};

export const deleteUserById = async (userId: number): Promise<void> => {
  logger.info(`Attempting to delete user ID: ${userId}`);
  const user = await get<User>("SELECT id FROM users WHERE id = ?", [userId]);
  if (!user) {
    logger.warn(`Delete failed: User ${userId} not found.`);
    throw new HttpError("User not found.", 404);
  }

  const result = await run("DELETE FROM users WHERE id = ?", [userId]);
  if (result.changes === 0) {
    logger.warn(
      `Delete operation for user ID: ${userId} resulted in no changes. User might have been deleted already.`
    );
  }
  logger.info(
    `User ID: ${userId} deleted successfully. Corresponding role entries (if any) also deleted via cascade.`
  );
};

export const getAllDepartments = async (): Promise<Department[]> => {
  logger.debug("Fetching all departments.");
  return await all<Department>(
    "SELECT id, name, createdAt, updatedAt FROM departments ORDER BY name ASC"
  );
};
