import sqlite3 from "sqlite3";
import { config } from "@/config";
import logger from "@/utils/logger";
import path from "path";

// Declare Node.js global for TypeScript
declare const __dirname: string;

const verboseSqlite3 = sqlite3.verbose();

// Construct the absolute path to the database file
const dbPath = path.resolve(
  __dirname,
  config.DATABASE_URL.startsWith("./")
    ? config.DATABASE_URL
    : `../../${config.DATABASE_URL}`
);
logger.info(`Database path: ${dbPath}`);

const db = new verboseSqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error("Could not connect to database", err);
    (process as any).exit(1); // Use process.exit directly
  } else {
    logger.info("Connected to SQLite database");
    // Enable foreign key support
    db.run("PRAGMA foreign_keys = ON;", (pragmaErr) => {
      if (pragmaErr) {
        logger.error(
          "Failed to enable PRAGMA foreign_keys:",
          pragmaErr.message
        );
      } else {
        logger.info("PRAGMA foreign_keys = ON enabled.");
      }
    });
  }
});

// Promisify db.run, db.get, db.all
interface DBRunResult {
  lastID: number;
  changes: number;
}

export const run = (
  sql: string,
  params: unknown[] = []
): Promise<DBRunResult> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      // Use function() to access this.lastID
      if (err) {
        logger.error(
          `SQL Error (run): ${sql} | Params: ${params} | Error: ${err.message}`
        );
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
};

export const get = <T>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row: T) => {
      if (err) {
        logger.error(
          `SQL Error (get): ${sql} | Params: ${params} | Error: ${err.message}`
        );
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

export const all = <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows: T[]) => {
      if (err) {
        logger.error(
          `SQL Error (all): ${sql} | Params: ${params} | Error: ${err.message}`
        );
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

export default db;
