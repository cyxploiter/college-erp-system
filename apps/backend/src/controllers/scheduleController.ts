
import { Response, NextFunction } from 'express';
import * as scheduleService from '@/services/scheduleService';
import { AuthenticatedRequest, APIResponse, ScheduleItem } from '@/types';

export const getMySchedules = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return (res as any).status(401).json({ success: false, message: 'Unauthorized: No user context.' });
    }
    const schedules = await scheduleService.getUserSchedules(req.user.id);
    const response: APIResponse<ScheduleItem[]> = {
        success: true,
        data: schedules
    };
    (res as any).status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Add other schedule controllers here
