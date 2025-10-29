import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { container, dbConnection } from "./config/inversify.config";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { NotificationController } from "./controllers/NotificationController";
import { createNotificationRoutes } from "./routes/notification.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

const logger = container.get<ILogger>(TYPES.Logger);
const healthCheck = container.get<IHealthCheck>(TYPES.HealthCheck);
const notificationController = container.get<NotificationController>("NotificationController");

// Health check
app.get("/health", async (req, res) => {
  const health = await healthCheck.check();
  res.json(health);
});

// Root endpoint
app.get("/", (req, res) => {
  logger.info("Root endpoint accessed");
  res.json({ 
    service: "Notification Service", 
    message: "Notification Service is running",
    version: "1.0.0",
    endpoints: {
      notifications: "/api/notifications",
      health: "/health"
    }
  });
});

// Notification routes
app.use("/api/notifications", createNotificationRoutes(notificationController));

// Start server
async function startServer() {
  try {
    await dbConnection.connect();
    logger.info("Database connected successfully");
    
    app.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await dbConnection.disconnect();
  process.exit(0);
});

startServer();