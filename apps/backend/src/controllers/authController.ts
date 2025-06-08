
import { Request, Response, NextFunction } from 'express';
import * as authService from '@/services/authService';
import { z } from 'zod';
import { APIResponse } from '@college-erp/common';

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(1, "Student/Employee ID is required"), // Changed from username
    password: z.string().min(1, "Password is required"),
  }),
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, password } = (req as any).body; // Changed from username
    const loginData = await authService.loginUser(identifier, password);
    
    const response: APIResponse<typeof loginData> = {
        success: true,
        data: loginData,
        message: "Login successful."
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};