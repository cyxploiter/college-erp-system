
import { Request, Response, NextFunction } from 'express';
import * as authService from '@/services/authService';
import { z } from 'zod';
import { APIResponse } from '@college-erp/common';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, "Username or email is required"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = (req as any).body;
    const loginData = await authService.loginUser(username, password);
    
    const response: APIResponse<typeof loginData> = {
        success: true,
        data: loginData,
        message: "Login successful."
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};
