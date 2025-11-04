import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { AppDataSource } from "./config/data-source";
import { ConsoleLogger } from "@observability/common";
import { LogsConsumer } from "./consumers/LogsConsumer";
import { MetricsConsumer } from "./consumers/MetricsConsumer";
import eventsRoutes from "./routes/events.routes";
import metricsRoutes from "./routes/metrics.routes";
import * as amqp from "amqplib";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3006;
const logger = new ConsoleLogger("event-consumer");

app.use(express.json());

// API Routes
app.get("/", (req, res) => {
  res.json({
    service: "Event Consumer Service",
    version: "1.0.0",
    status: "running",
    endpoints: {
      events: "/api/events",
      metrics: "/api/metrics",
      health: "/health"
    }
  });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    service: "event-consumer",
    database: AppDataSource.isInitialized ? "connected" : "disconnected"
  });
});

app.use("/api/events", eventsRoutes);
app.use("/api/metrics", metricsRoutes);

async function startServer() {
  try {
    // 1. Connect to Database
    await AppDataSource.initialize();
    logger.info("Database connected successfully");

    // 2. Connect to RabbitMQ directly with amqplib
    const rabbitmqUrl = process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();
    
    logger.info("RabbitMQ connected successfully");

    // 3. Assert exchange and queues
    const exchangeName = process.env.RABBITMQ_EXCHANGE || "observability.events";
    await channel.assertExchange(exchangeName, "topic", { durable: true });
    
    await channel.assertQueue("logs-queue", { durable: true });
    await channel.bindQueue("logs-queue", exchangeName, "logs.*");
    
    await channel.assertQueue("metrics-queue", { durable: true });
    await channel.bindQueue("metrics-queue", exchangeName, "metrics.*");
    
    logger.info("Queues bound successfully");

    // 4. Start Consumers - Pass channel directly
    const logsConsumer = new LogsConsumer(logger, channel);
    await logsConsumer.start();

    const metricsConsumer = new MetricsConsumer(logger, channel);
    await metricsConsumer.start();

    // 5. Start HTTP Server
    app.listen(PORT, () => {
      logger.info("=".repeat(60));
      logger.info(`🚀 Event Consumer Service started successfully`);
      logger.info(`📡 Port: ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`📊 Database: ${process.env.DB_NAME}`);
      logger.info(`📥 Consuming from RabbitMQ queues`);
      logger.info("=".repeat(60));
      logger.info(`   ✓ Logs Consumer: logs-queue`);
      logger.info(`   ✓ Metrics Consumer: metrics-queue`);
      logger.info("=".repeat(60));
      logger.info(`🔍 API Endpoints:`);
      logger.info(`   ✓ GET /api/events - Recent events`);
      logger.info(`   ✓ GET /api/events/service/:service`);
      logger.info(`   ✓ GET /api/events/trace/:traceId`);
      logger.info(`   ✓ GET /api/events/errors`);
      logger.info(`   ✓ GET /api/metrics/:service/avg-response-time`);
      logger.info(`   ✓ GET /api/metrics/:service/error-rate`);
      logger.info("=".repeat(60));
    });

    // Handle graceful shutdown
    process.on("SIGTERM", async () => {
      logger.info("SIGTERM received, closing connections...");
      await channel.close();
      await connection.close();
      await AppDataSource.destroy();
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      logger.info("SIGINT received, closing connections...");
      await channel.close();
      await connection.close();
      await AppDataSource.destroy();
      process.exit(0);
    });

  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
}

startServer();