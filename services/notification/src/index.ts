import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { container, dbConnection } from "./config/inversify.config";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { NotificationController } from "./controllers/NotificationController";
import { createNotificationRoutes } from "./routes/notification.routes";
import { EventPublisher, RabbitMQConnection } from "@observability/common";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

const logger = container.get<ILogger>(TYPES.Logger);
const healthCheck = container.get<IHealthCheck>(TYPES.HealthCheck);
const notificationController = container.get<NotificationController>("NotificationController");
const eventPublisher = container.get<EventPublisher>("EventPublisher");
const rabbitMQConnection = container.get<RabbitMQConnection>("RabbitMQConnection");

app.get("/health", async (req, res) => {
  const health = await healthCheck.check();
  res.json(health);
});

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

app.use("/api/notifications", createNotificationRoutes(notificationController));

async function startServer() {
  try {
    await dbConnection.connect();
    logger.info("Database connected successfully");

    logger.info("Connecting to RabbitMQ...");
    await rabbitMQConnection.connect();
    logger.info("RabbitMQ connected successfully");

    app.listen(PORT, () => {
      logger.info(`Notification Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
}

process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  try {
    await dbConnection.disconnect();
    await rabbitMQConnection.disconnect();
  } catch (e) {
    logger.error("Error during shutdown", e as Error);
  }
  process.exit(0);
});

startServer();
