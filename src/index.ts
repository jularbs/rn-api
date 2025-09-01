import "reflect-metadata";
import dotenv from "dotenv";

// Load environment variables FIRST
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import morgan from "morgan";

// Import database connection
import connectDB from "./config/database";

// Import routes
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import stationRoutes from "./routes/stations";
import categoriesRoutes from "./routes/categories";
import tagsRoutes from "./routes/tags";

//import middlewares
import { createRateLimiter, corsConfig } from "./middleware";
import { AppInfo, HealthCheckResponse } from "./types";

// Set max listeners to prevent memory leak warnings
process.setMaxListeners(15);

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors(corsConfig()));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("combined"));
app.use(createRateLimiter({})); // 50 requests per minute by default

// Routes
app.get("/", (req: Request, res: Response) => {
  const response: AppInfo = {
    message: "Welcome to Radyo Natin API",
    version: "0.0.1",
    status: "running",
  };
  res.json(response);
});

app.get("/api/health", (req: Request, res: Response) => {
  const response: HealthCheckResponse = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: "0.0.1",
  };
  res.json(response);
});

// API Routes
app.use("/api", authRoutes);
app.use("/api", usersRoutes);
app.use("/api", stationRoutes);
app.use("/api", categoriesRoutes);
app.use("/api/tags", tagsRoutes);

// 404 handler
app.use("*", (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Internal server error",
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Radyo Natin API is running on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = (): void => {
  console.log("Received shutdown signal, shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

// Only add these listeners if they haven't been added already
if (!process.listenerCount("SIGTERM")) {
  process.on("SIGTERM", gracefulShutdown);
}
if (!process.listenerCount("SIGINT")) {
  process.on("SIGINT", gracefulShutdown);
}

export default app;
