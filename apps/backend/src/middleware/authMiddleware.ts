import { Request, Response, NextFunction } from "express";
import { verifyToken } from "@/utils/jwt";
import { UserPayload, UserRole } from "@college-erp/common";
import logger from "@/utils/logger";

// This interface is correctly defined in @/types and extends express.Request
// If 'headers' is not found, it's a deeper TS issue.
// For this exercise, we'll use the imported AuthenticatedRequest.
import { AuthenticatedRequest } from "@/types";

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = (req as any).headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Authentication attempt without token or invalid format");
    return (res as any).status(401).json({
      success: false,
      message: "Unauthorized: No token provided or invalid format.",
    });
  }

  const token = authHeader.split(" ")[1];
  const decodedUser = verifyToken(token);

  if (!decodedUser) {
    logger.warn("Authentication attempt with invalid or expired token");
    return (res as any).status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired token.",
    });
  }

  req.user = decodedUser; // This assignment should be fine if AuthenticatedRequest is correctly typed
  logger.debug(
    `User authenticated: ${decodedUser.name} (ID: ${decodedUser.id}, Role: ${decodedUser.role})`
  ); // Changed username to name
  next();
};

export const authorize = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn("Authorization attempt without prior authentication");
      return (res as any)
        .status(401)
        .json({ success: false, message: "Unauthorized." });
    }
    if (!roles.includes(req.user.role)) {
      logger.warn(
        `Authorization failed for user ${
          req.user.name
        }. Required roles: ${roles.join(", ")}, User role: ${req.user.role}`
      ); // Changed username to name
      return (res as any).status(403).json({
        success: false,
        message:
          "Forbidden: You do not have permission to access this resource.",
      });
    }
    logger.debug(
      `User ${req.user.name} authorized for roles: ${roles.join(", ")}`
    ); // Changed username to name
    next();
  };
};
