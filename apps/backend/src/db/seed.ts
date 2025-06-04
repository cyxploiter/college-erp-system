
import dbDefault, { run, get, all } from './db'; // dbDefault is the actual sqlite3.Database instance
import bcrypt from 'bcryptjs';
import logger from '@/utils/logger';
import sqlite3 from 'sqlite3'; // Import sqlite3 for type if needed, or rely on dbDefault
import path from 'path';
import { config } from '@/config';


const seedDatabase = async () => {
  logger.info('Starting database seeding...');
  
  // For seeding, it's often better to use a dedicated connection
  // or ensure the main 'db' from './db.ts' is used consistently.
  // The current './db.ts' exports `db` (the connection) and `run`, `get`, `all` (promisified methods using that `db`).
  // So, using `get` and `run` here will use the shared connection.

  try {
    // Users
    const users = [
      { username: 'admin', password: 'password123', role: 'admin', email: 'admin@example.com' },
      { username: 'student1', password: 'password123', role: 'student', email: 'student1@example.com' },
      { username: 'faculty1', password: 'password123', role: 'faculty', email: 'faculty1@example.com' },
      { username: 'student2', password: 'password123', role: 'student', email: 'student2@example.com' },
    ];

    const userIds: { [username: string]: number } = {};

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      try {
        const result = await run(
          'INSERT INTO users (username, passwordHash, role, email) VALUES (?, ?, ?, ?)',
          [user.username, passwordHash, user.role, user.email]
        );
        userIds[user.username] = result.lastID;
        logger.info(`User ${user.username} inserted with ID ${result.lastID}.`);
      } catch (error) {
         const err = error as Error & { code?: string };
        if (err.code === 'SQLITE_CONSTRAINT') { // SQLITE_CONSTRAINT_UNIQUE specifically
          logger.warn(`User ${user.username} or email ${user.email} already exists. Skipping insertion.`);
        } else {
          throw err; // Re-throw other errors
        }
      }
    }

    // Fetch IDs if they were skipped due to existing
    for (const user of users) {
        if (!userIds[user.username]) {
            // Use the imported 'get' function which uses the shared db connection
            const existingUser = await get<{ id: number }>('SELECT id FROM users WHERE username = ?', [user.username]);
            if (existingUser) {
                userIds[user.username] = existingUser.id;
                logger.info(`Found existing user ${user.username} with ID ${existingUser.id}.`);
            } else {
                 logger.warn(`User ${user.username} still not found after checking existing. This should not happen if insert was skipped due to constraint.`);
            }
        }
    }


    // Schedules
    if (userIds.student1) {
      const schedulesStudent1 = [
        { className: 'Calculus I', roomNumber: 'A101', startTime: '2024-09-02T09:00:00Z', endTime: '2024-09-02T10:30:00Z', dayOfWeek: 'Monday', userId: userIds.student1 },
        { className: 'Physics for Engineers', roomNumber: 'B203', startTime: '2024-09-02T11:00:00Z', endTime: '2024-09-02T12:30:00Z', dayOfWeek: 'Monday', userId: userIds.student1 },
        { className: 'Intro to Programming', roomNumber: 'C305', startTime: '2024-09-03T14:00:00Z', endTime: '2024-09-03T15:30:00Z', dayOfWeek: 'Tuesday', userId: userIds.student1 },
      ];
      for (const schedule of schedulesStudent1) {
        await run(
          'INSERT INTO schedules (className, roomNumber, startTime, endTime, dayOfWeek, userId) VALUES (?, ?, ?, ?, ?, ?)',
          [schedule.className, schedule.roomNumber, schedule.startTime, schedule.endTime, schedule.dayOfWeek, schedule.userId]
        );
      }
      logger.info(`Schedules for student1 inserted.`);
    } else {
        logger.warn('student1 ID not found, skipping their schedules.');
    }


    if (userIds.student2) {
      const schedulesStudent2 = [
        { className: 'Calculus I', roomNumber: 'A101', startTime: '2024-09-02T09:00:00Z', endTime: '2024-09-02T10:30:00Z', dayOfWeek: 'Monday', userId: userIds.student2 },
        { className: 'Organic Chemistry', roomNumber: 'D110', startTime: '2024-09-04T10:00:00Z', endTime: '2024-09-04T11:30:00Z', dayOfWeek: 'Wednesday', userId: userIds.student2 },
      ];
      for (const schedule of schedulesStudent2) {
        await run(
          'INSERT INTO schedules (className, roomNumber, startTime, endTime, dayOfWeek, userId) VALUES (?, ?, ?, ?, ?, ?)',
          [schedule.className, schedule.roomNumber, schedule.startTime, schedule.endTime, schedule.dayOfWeek, schedule.userId]
        );
      }
       logger.info(`Schedules for student2 inserted.`);
    } else {
        logger.warn('student2 ID not found, skipping their schedules.');
    }


    // Messages
    if (userIds.admin && userIds.student1 && userIds.faculty1) { // Ensure faculty1 also exists for the message
      const messages = [
        { senderId: userIds.admin, subject: 'Welcome!', content: 'Welcome to the new ERP system. Please familiarize yourself with the dashboard.', type: 'Broadcast', priority: 'Normal' as const },
        { senderId: userIds.faculty1, receiverId: userIds.student1, subject: 'Assignment Reminder', content: 'Dont forget the upcoming deadline for Calculus I.', type: 'Direct', priority: 'Urgent' as const },
        { senderId: null, subject: 'System Maintenance', content: 'The system will be down for maintenance on Sunday from 2 AM to 4 AM.', type: 'Broadcast', priority: 'Critical' as const },
      ];
      for (const message of messages) {
        await run(
          'INSERT INTO messages (senderId, receiverId, subject, content, type, priority) VALUES (?, ?, ?, ?, ?, ?)',
          [message.senderId, message.receiverId, message.subject, message.content, message.type, message.priority]
        );
      }
      logger.info(`Sample messages inserted.`);
    } else {
        logger.warn('Admin, student1 or faculty1 ID not found, skipping messages seed.');
    }


    logger.info('Database seeding completed successfully.');

  } catch (error) {
    const err = error as Error;
    logger.error('Error seeding database:', err.message, err.stack);
  } finally {
    // If this script is run standalone, it should close the database connection.
    // dbDefault is the actual sqlite3.Database instance from './db.ts'.
    if (require.main === module) {
        dbDefault.close((err) => {
          if (err) {
            logger.error('Error closing database connection after seeding:', err.message);
          } else {
            logger.info('Database connection closed after seeding.');
          }
        });
    }
  }
};

if (require.main === module) {
  seedDatabase();
}
