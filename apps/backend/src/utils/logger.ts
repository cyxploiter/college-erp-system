
import winston from 'winston';
import { config } from '@/config';

const { combine, timestamp, printf, colorize, splat, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp: ts, stack, ...metadata }) => {
  let msg = `${ts} [${level}]: ${message}`;
  if (stack) {
    msg += ` - ${stack}`;
  }
  // Log additional metadata if any
  const metaString = Object.keys(metadata).length ? JSON.stringify(metadata) : '';
  if (metaString && metaString !== '{}') {
    msg += ` ${metaString}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: config.LOG_LEVEL || 'info',
  format: combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Log the stack trace if an error is passed
    splat(), // Interpolate splat %s %d %j values into messages
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
});

// Stream for morgan http logging
export const morganStream = {
    write: (message: string) => {
      logger.http(message.trim());
    },
  };

export default logger;
