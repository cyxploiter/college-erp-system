
import { Response, NextFunction } from 'express';
import * as userService from '@/services/userService';
import { AuthenticatedRequest, APIResponse, UserPayload } from '@/types'; // Use backend specific types

export const getMyProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      // This should ideally be caught by authMiddleware, but as a safeguard:
      return (res as any).status(401).json({ success: false, message: 'Unauthorized: No user context.' });
    }
    const userProfile = await userService.getUserProfileById(req.user.id);
    const response: APIResponse<UserPayload> = {
        success: true,
        data: userProfile
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Add other user controllers here (e.g., getUserById for admin)
