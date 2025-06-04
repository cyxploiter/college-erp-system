
import db from './db'; // Import the opened db connection
import logger from '@/utils/logger';

const createSchema = async () => {
  logger.info('Starting database schema initialization...');

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      role TEXT CHECK(role IN ('student', 'faculty', 'admin')) NOT NULL,
      email TEXT UNIQUE NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSchedulesTable = `
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      className TEXT NOT NULL,
      roomNumber TEXT,
      startTime DATETIME NOT NULL,
      endTime DATETIME NOT NULL,
      dayOfWeek TEXT NOT NULL, -- e.g., 'Monday', 'Tuesday'
      userId INTEGER NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    );
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      senderId INTEGER, -- Can be NULL for system messages
      receiverId INTEGER, -- Can be NULL for broadcast messages
      subject TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      priority TEXT CHECK(priority IN ('Normal', 'Urgent', 'Critical')) DEFAULT 'Normal',
      type TEXT CHECK(type IN ('Broadcast', 'Direct')) NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      isRead BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (senderId) REFERENCES users (id) ON DELETE SET NULL,
      FOREIGN KEY (receiverId) REFERENCES users (id) ON DELETE SET NULL
    );
  `;
  
  // Trigger to update 'updatedAt' timestamp on users table
  const createUsersUpdatedAtTrigger = `
    CREATE TRIGGER IF NOT EXISTS update_users_updatedAt
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `;

  // Trigger to update 'updatedAt' timestamp on schedules table
  const createSchedulesUpdatedAtTrigger = `
    CREATE TRIGGER IF NOT EXISTS update_schedules_updatedAt
    AFTER UPDATE ON schedules
    FOR EACH ROW
    BEGIN
      UPDATE schedules SET updatedAt = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;
  `;

  try {
    await new Promise<void>((resolve, reject) => {
      db.serialize(() => {
        db.exec(createUsersTable, (err) => {
          if (err) return reject(new Error(`Failed to create users table: ${err.message}`));
          logger.info('Users table created or already exists.');
        });
        db.exec(createSchedulesTable, (err) => {
          if (err) return reject(new Error(`Failed to create schedules table: ${err.message}`));
          logger.info('Schedules table created or already exists.');
        });
        db.exec(createMessagesTable, (err) => {
          if (err) return reject(new Error(`Failed to create messages table: ${err.message}`));
          logger.info('Messages table created or already exists.');
        });
        db.exec(createUsersUpdatedAtTrigger, (err) => {
          if (err) return reject(new Error(`Failed to create users updatedAt trigger: ${err.message}`));
          logger.info('Users updatedAt trigger created or already exists.');
        });
        db.exec(createSchedulesUpdatedAtTrigger, (err) => {
          if (err) return reject(new Error(`Failed to create schedules updatedAt trigger: ${err.message}`));
          logger.info('Schedules updatedAt trigger created or already exists.');
          resolve();
        });
      });
    });
    logger.info('Database schema initialized successfully.');
  } catch (error) {
    const err = error as Error;
    logger.error('Error initializing database schema:', err.message);
    (process as { exit: (code?: number) => void }).exit(1); // Exit if schema initialization fails
  } finally {
    // db.close is called on an already open db instance from db.ts
    // The db instance in db.ts is the one used for operations.
    // If this script re-opens it or uses a different instance, then closing here is fine.
    // Assuming 'db' here is the shared instance, it might be closed prematurely if other operations follow.
    // However, given it's an init script, closing at the end is typical.
    // The original db.ts creates 'db' and it's not closed there, it's exported.
    // This init script should use the functions from 'db.ts' (run, get, all) rather than 'db.exec' directly,
    // or ensure it's operating on a separate connection for init purposes.
    // For now, assuming db.close() here is intended for THIS script's lifecycle of the shared db.
    // To be safe, only close if this script exclusively owns the connection it's closing.
    // The current setup seems to use the global 'db' from './db.ts'. This file is often run standalone.

    // const newDb = new sqlite3.Database(dbPath...); // If it were its own connection
    // newDb.close()
    // Since it uses the global 'db', we should be careful.
    // If `require.main === module`, it's run as a script, so closing the shared `db` is probably the intended end.
    if (require.main === module) {
        db.close((err) => {
          if (err) {
            logger.error('Error closing database connection:', err.message);
          } else {
            logger.info('Database connection closed after schema initialization.');
          }
        });
    }
  }
};

// Execute the function if the script is run directly
if (require.main === module) {
  createSchema();
}
