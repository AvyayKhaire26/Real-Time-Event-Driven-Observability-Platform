import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { container, dbConnection } from "./config/inversify.config";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { OrderController } from "./controllers/OrderController";
import { createOrderRoutes } from "./routes/order.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

const logger = container.get<ILogger>(TYPES.Logger);
const healthCheck = container.get<IHealthCheck>(TYPES.HealthCheck);
const orderController = container.get<OrderController>("OrderController");

// Health check
app.get("/health", async (req, res) => {
  const health = await healthCheck.check();
  res.json(health);
});

// Root endpoint
app.get("/", (req, res) => {
  logger.info("Root endpoint accessed");
  res.json({ 
    service: "Order Service", 
    message: "Order Service is running",
    version: "1.0.0",
    endpoints: {
      orders: "/api/orders",
      health: "/health"
    }
  });
});

// Order routes
app.use("/api/orders", createOrderRoutes(orderController));

// Start server
async function startServer() {
  try {
    await dbConnection.connect();
    logger.info("Database connected successfully");
    
    app.listen(PORT, () => {
      logger.info(`Order Service running on port ${PORT}`);
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