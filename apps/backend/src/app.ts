import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan"; // For HTTP request logging
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import scheduleRoutes from "./routes/scheduleRoutes";
import messageRoutes from "./routes/messageRoutes";
import { config } from "./config";
import logger, { morganStream } from "./utils/logger";

const app = express();

// Security Middleware
app.use(helmet()); // Helps secure your apps by setting various HTTP headers

// CORS Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Adjust for your frontend URL
    credentials: true, // If you need to handle cookies or authorization headers
  })
);

// JSON Body Parser & URL Encoded Body Parser
app.use(express.json() as any); // Cast to any
app.use(express.urlencoded({ extended: true }) as any); // Cast to any

// HTTP Request Logging
// Use 'combined' for production-like logs, 'dev' for colorful, concise development logs
const morganFormat = config.NODE_ENV === "development" ? "dev" : "combined";
app.use(morgan(morganFormat, { stream: morganStream }) as any); // Cast to any

// API Routes
app.get("/api/health", (req, res) => {
  (res as any)
    .status(200)
    .json({ status: "UP", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/messages", messageRoutes);

// Centralized Error Handling Middleware
// This should be the last piece of middleware added
app.use(errorHandler as any); // Cast to any

// 404 Handler for unmatched routes
app.use((req, res) => {
  logger.warn(
    `404 Not Found: ${(req as any).method} ${(req as any).originalUrl}`
  );
  (res as any)
    .status(404)
    .json({ success: false, message: "Resource not found." });
});

export default app;
