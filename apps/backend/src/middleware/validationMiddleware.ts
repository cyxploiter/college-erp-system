
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: (req as any).body,
      query: (req as any).query,
      params: (req as any).params,
    });
    return (next as any)();
  } catch (error) {
    if (error instanceof ZodError) {
      return (next as any)(error); // Pass to centralized error handler
    }
    return (next as any)(new Error('Internal validation error'));
  }
};