
import { Response, NextFunction } from 'express';
import * as scheduleService from '@/services/scheduleService';
import { AuthenticatedRequest, APIResponse, ScheduleItem } from '@/types'; // ScheduleItem from common might be basic
import { HttpError } from '@/middleware/errorHandler';

// The service now returns PopulatedScheduleItem, which is richer.
// The APIResponse should reflect this if the frontend needs all that data.
// For now, we'll keep ScheduleItem as the generic type, but frontend will receive more fields.
export const getMySchedules = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      // This should ideally be caught by authMiddleware earlier
      return (next as any)(new HttpError('Unauthorized: No user context.', 401));
    }
    // Pass user's role to the service function
    const schedules = await scheduleService.getUserSchedules(req.user.id, req.user.role);
    
    const response: APIResponse<typeof schedules> = { // Use typeof schedules to match the richer data
        success: true,
        data: schedules
    };
    (res as any).status(200).json(response);
  } catch (error) {
    (next as any)(error);
  }
};