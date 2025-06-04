
import { all } from '@/db/db';
import { ScheduleItem } from '@college-erp/common';
import logger from '@/utils/logger';

export const getUserSchedules = async (userId: number): Promise<ScheduleItem[]> => {
  logger.debug(`Fetching schedules for user ID: ${userId}`);
  const schedules = await all<ScheduleItem>(
    'SELECT id, className, roomNumber, startTime, endTime, dayOfWeek, userId, createdAt, updatedAt FROM schedules WHERE userId = ? ORDER BY startTime ASC',
    [userId]
  );
  logger.info(`Found ${schedules.length} schedule items for user ID: ${userId}`);
  return schedules;
};

// Add other schedule-related service functions here (e.g., createSchedule, updateSchedule for admin)
