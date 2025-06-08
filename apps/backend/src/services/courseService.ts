
import { all } from '@/db/db';
import { CourseBasicInfo } from '@college-erp/common';
import logger from '@/utils/logger';

export const getAllCoursesBasicInfo = async (): Promise<CourseBasicInfo[]> => {
  logger.debug('Fetching basic info for all courses.');
  const courses = await all<CourseBasicInfo>(
    'SELECT id, courseCode, courseName FROM courses ORDER BY courseName ASC'
  );
  return courses;
};

// Future: Add full CRUD for courses if needed
// export const getAllCourses = async (): Promise<Course[]> => { ... }
// export const getCourseById = async (id: number): Promise<Course | null> => { ... }
// export const createCourse = async (data: CreateCourseInput): Promise<Course> => { ... }
// export const updateCourse = async (id: number, data: UpdateCourseInput): Promise<Course | null> => { ... }
// export const deleteCourse = async (id: number): Promise<void> => { ... }
