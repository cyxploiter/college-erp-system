import { Response, NextFunction } from "express";
import * as userService from "@/services/userService";
import {
  AuthenticatedRequest,
  APIResponse,
  UserPayload,
  UserRole,
  UserProfileResponse,
  Department,
} from "@/types";
import { z } from "zod";
import { HttpError } from "@/middleware/errorHandler";

export const getMyProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new HttpError("Unauthorized: No user context.", 401));
    }
    const userProfile = await userService.getUserProfileById(req.user.id); // Returns UserProfileResponse
    const response: APIResponse<UserProfileResponse> = {
      // Adjusted type
      success: true,
      data: userProfile,
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// --- Admin User Management Controllers ---

const userRoleEnum = z.enum(["student", "faculty", "admin"]);

export const createUserSchema = z.object({
  body: z.object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters long.")
      .max(50),
    email: z.string().email("Invalid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long.")
      .max(100),
    role: userRoleEnum,
    departmentId: z.number().int().positive().optional().nullable(), // For faculty's department or user's general dept
    // Optional role-specific fields
    major: z.string().optional().nullable(), // For student
    officeNumber: z.string().optional().nullable(), // For faculty
    specialization: z.string().optional().nullable(), // For faculty
    permissionLevel: z.string().optional().nullable(), // For admin
  }),
});

export const handleCreateUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // const { username, email, password, role, departmentId, major, officeNumber, specialization, permissionLevel } = (req as any).body;
    const createUserInput: userService.CreateUserInput = {
      ...(req as any).body,
      password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: (req as any)
        .body.password,
    };

    const newUser = await userService.createUser(createUserInput);
    const response: APIResponse<UserPayload> = {
      success: true,
      data: newUser,
      message: "User created successfully.",
    };
    (res as any).status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export const handleGetAllUsers = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const users = await userService.getAllUsers(); // Returns UserPayload[]
    const response: APIResponse<UserPayload[]> = {
      success: true,
      data: users,
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handleGetUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = parseInt((req as any).params.userId, 10);
    if (isNaN(userId)) {
      return next(new HttpError("Invalid user ID format.", 400));
    }
    // Use getUserProfileById to get detailed info including role-specific details
    const user = await userService.getUserProfileById(userId); // Returns UserProfileResponse
    if (!user) {
      // Should be caught by HttpError in service, but double check
      return next(new HttpError("User not found.", 404));
    }
    const response: APIResponse<UserProfileResponse> = {
      // Adjusted type
      success: true,
      data: user,
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const updateUserSchema = z.object({
  params: z.object({
    userId: z.string().refine((val) => !isNaN(parseInt(val, 10)), {
      message: "User ID must be a number.",
    }),
  }),
  body: z
    .object({
      username: z.string().min(3).max(50).optional(),
      email: z.string().email().optional(),
      role: userRoleEnum.optional(),
      departmentId: z.number().int().positive().optional().nullable(),
      // Optional role-specific fields
      major: z.string().optional().nullable(),
      officeNumber: z.string().optional().nullable(),
      specialization: z.string().optional().nullable(),
      permissionLevel: z.string().optional().nullable(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field must be provided for update.",
    }),
});

export const handleUpdateUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = parseInt((req as any).params.userId, 10);
    const updateData = (req as any).body as userService.UpdateUserInput;

    const updatedUser = await userService.updateUserById(userId, updateData); // Returns UserPayload
    const response: APIResponse<UserPayload> = {
      success: true,
      data: updatedUser,
      message: "User updated successfully.",
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const handleDeleteUserById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = parseInt((req as any).params.userId, 10);
    if (isNaN(userId)) {
      return next(new HttpError("Invalid user ID format.", 400));
    }
    if (req.user?.id === userId) {
      return next(
        new HttpError("Cannot delete your own account via this endpoint.", 403)
      );
    }

    await userService.deleteUserById(userId);
    const response: APIResponse<null> = {
      success: true,
      message: "User deleted successfully.",
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Controller for departments
export const handleGetAllDepartments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const departments = await userService.getAllDepartments();
    const response: APIResponse<Department[]> = {
      success: true,
      data: departments,
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};
