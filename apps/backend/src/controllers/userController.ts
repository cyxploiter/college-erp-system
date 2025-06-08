
import { Response, NextFunction } from 'express';
import * as userService from '@/services/userService';
import { AuthenticatedRequest, APIResponse, UserPayload, UserRole, UserProfileResponse, Department, CreateUserInput, UpdateUserInput } from '@/types';
import { z } from 'zod';
import { HttpError } from '@/middleware/errorHandler';

export const getMyProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return (next as any)(new HttpError('Unauthorized: No user context.', 401));
    }
    const userProfile = await userService.getUserProfileById(req.user.id); // req.user.id is already string
    const response: APIResponse<UserProfileResponse> = {
        success: true,
        data: userProfile
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

const userRoleEnum = z.enum(['student', 'faculty', 'admin', 'superuser']);

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters long.").max(100),
    email: z.string().email("Invalid email address."),
    profilePictureUrl: z.string().url("Invalid URL for profile picture.").optional().nullable(),
    password: z.string().min(8, "Password must be at least 8 characters long.").max(100),
    role: userRoleEnum,
    departmentId: z.number().int().positive().optional().nullable(),

    program: z.string().max(100).optional().nullable(),
    branch: z.string().max(100).optional().nullable(),
    expectedGraduationYear: z.number().int().positive().optional().nullable(),
    currentYearOfStudy: z.number().int().min(1).max(10).optional().nullable(),
    gpa: z.number().min(0).max(10).optional().nullable(),
    academicStatus: z.string().max(50).optional().nullable(),
    fatherName: z.string().max(100).optional().nullable(),
    motherName: z.string().max(100).optional().nullable(),
    dateOfBirth: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), { message: "Invalid date format for Date of Birth" }),
    phoneNumber: z.string().max(20).optional().nullable(),
    permanentAddress: z.string().max(255).optional().nullable(),
    currentAddress: z.string().max(255).optional().nullable(),

    officeNumber: z.string().max(50).optional().nullable(),
    specialization: z.string().max(100).optional().nullable(),
    
    permissionLevel: z.string().max(50).optional().nullable(),

    superuserPermissions: z.string().optional().nullable(),
  }),
});

export const handleCreateUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const createUserInput: CreateUserInput = {
        ...(req as any).body,
        password_DO_NOT_USE_THIS_FIELD_EVER_EXCEPT_ON_CREATE_ONLY: (req as any).body.password,
    };
    
    const newUser = await userService.createUser(createUserInput);
    const response: APIResponse<UserPayload> = {
        success: true,
        data: newUser,
        message: "User created successfully."
    };
    (res as any).status(201).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleGetAllUsers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllUsers();
    const response: APIResponse<UserPayload[]> = {
        success: true,
        data: users
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleGetUserById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).params.userId as string; // userId from URL param is string
    // No need to parseInt, userService.getUserProfileById expects string
    const user = await userService.getUserProfileById(userId);
    if (!user) {
      return (next as any)(new HttpError("User not found.", 404));
    }
    const response: APIResponse<UserProfileResponse> = {
        success: true,
        data: user
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const updateUserSchema = z.object({
  params: z.object({
    userId: z.string().min(1, "User ID is required."), // userId is now a string
  }),
  body: z.object({
    name: z.string().min(3).max(100).optional(),
    email: z.string().email().optional(),
    profilePictureUrl: z.string().url().optional().nullable(),
    departmentId: z.number().int().positive().optional().nullable(),

    program: z.string().max(100).optional().nullable(),
    branch: z.string().max(100).optional().nullable(),
    expectedGraduationYear: z.number().int().positive().optional().nullable(),
    currentYearOfStudy: z.number().int().min(1).max(10).optional().nullable(),
    gpa: z.number().min(0).max(10).optional().nullable(),
    academicStatus: z.string().max(50).optional().nullable(),
    fatherName: z.string().max(100).optional().nullable(),
    motherName: z.string().max(100).optional().nullable(),
    dateOfBirth: z.string().optional().nullable().refine(val => !val || !isNaN(Date.parse(val)), { message: "Invalid date format" }),
    phoneNumber: z.string().max(20).optional().nullable(),
    permanentAddress: z.string().max(255).optional().nullable(),
    currentAddress: z.string().max(255).optional().nullable(),

    officeNumber: z.string().max(50).optional().nullable(),
    specialization: z.string().max(100).optional().nullable(),
    
    permissionLevel: z.string().max(50).optional().nullable(),

    superuserPermissions: z.string().optional().nullable(),
  }).refine(data => Object.keys(data).length > 0, { message: "At least one field must be provided for update."}),
});

export const handleUpdateUserById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).params.userId as string; // userId is string
    const updateData = (req as any).body as UpdateUserInput;
    
    const updatedUser = await userService.updateUserById(userId, updateData);
    const response: APIResponse<UserPayload> = {
        success: true,
        data: updatedUser,
        message: "User updated successfully."
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleDeleteUserById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).params.userId as string; // userId is string
    if (req.user?.id === userId) { // req.user.id is string
        return (next as any)(new HttpError("Cannot delete your own account via this endpoint.", 403));
    }

    await userService.deleteUserById(userId);
    const response: APIResponse<null> = {
        success: true,
        message: "User deleted successfully."
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};

export const handleGetAllDepartments = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const departments = await userService.getAllDepartments();
    const response: APIResponse<Department[]> = {
      success: true,
      data: departments,
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};