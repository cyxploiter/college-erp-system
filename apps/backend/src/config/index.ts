
import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env file from the root of the backend app
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  LOG_LEVEL: z.string().default('info'),
});

let validatedEnv;
try {
  validatedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("Environment variable validation failed:", error.flatten().fieldErrors);
    (process as { exit: (code?: number) => void }).exit(1);
  }
  throw error;
}

export const config = validatedEnv;
