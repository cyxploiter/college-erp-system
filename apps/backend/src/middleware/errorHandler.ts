import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import logger from "@/utils/logger";

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, HttpError.prototype); // To make 'instanceof HttpError' work
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: Error | HttpError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "An unexpected error occurred.";
  let errorDetails: unknown | undefined = undefined;

  const reqMethod = (req as any).method;
  const reqOriginalUrl = (req as any).originalUrl;

  if (err instanceof HttpError) {
    statusCode = err.status;
    message = err.message;
    errorDetails = err.details;
    // logger.warn(
    //   `HttpError [${statusCode}] on ${reqMethod} ${reqOriginalUrl}: ${message}`,
    //   { details: errorDetails, stack: err.stack }
    // );
  } else if (err instanceof ZodError) {
    statusCode = 400; // Bad Request
    message = "Validation failed.";
    errorDetails = err.flatten().fieldErrors;
    logger.warn(
      `ZodError (Validation Failed) [${statusCode}] on ${reqMethod} ${reqOriginalUrl}: ${message}`,
      { errors: errorDetails }
    );
  } else if (err instanceof Error) {
    // Standard Error
    message = err.message || "Internal Server Error";
    // In development, you might want to send the stack trace
    // if (process.env.NODE_ENV === 'development') {
    //   errorDetails = { stack: err.stack };
    // }
    logger.error(
      `Unhandled Error [${statusCode}] on ${reqMethod} ${reqOriginalUrl}: ${err.message}`,
      { stack: err.stack, error: err }
    );
  } else {
    // Fallback for non-Error objects thrown
    logger.error(
      `Unknown error type thrown [${statusCode}] on ${reqMethod} ${reqOriginalUrl}:`,
      { error: err }
    );
  }

  (res as any).status(statusCode).json({
    success: false,
    message,
    ...(errorDetails ? { details: errorDetails } : {}), // Conditionally add details
  });
};
