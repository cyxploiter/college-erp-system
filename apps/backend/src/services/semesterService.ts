
import { all } from '@/db/db';
import { SemesterBasicInfo } from '@college-erp/common';
import logger from '@/utils/logger';

export const getAllSemestersBasicInfo = async (): Promise<SemesterBasicInfo[]> => {
  logger.debug('Fetching basic info for all semesters.');
  // Order by year then name to ensure logical sorting e.g. Odd 2024, Even 2024, Odd 2025
  const semesters = await all<SemesterBasicInfo>(
    'SELECT id, name FROM semesters ORDER BY year DESC, name ASC'
  );
  return semesters;
};

// Future: Add full CRUD for semesters if needed
// export const getAllSemesters = async (): Promise<Semester[]> => { ... }
// etc.
