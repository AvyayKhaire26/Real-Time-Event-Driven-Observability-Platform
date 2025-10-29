import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { container, dbConnection } from "./config/inversify.config";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { InvoiceController } from "./controllers/InvoiceController";
import { createInvoiceRoutes } from "./routes/invoice.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

const logger = container.get<ILogger>(TYPES.Logger);
const healthCheck = container.get<IHealthCheck>(TYPES.HealthCheck);
const invoiceController = container.get<InvoiceController>("InvoiceController");

// Health check
app.get("/health", async (req, res) => {
  const health = await healthCheck.check();
  res.json(health);
});

// Root endpoint
app.get("/", (req, res) => {
  logger.info("Root endpoint accessed");
  res.json({ 
    service: "Print/Invoice Service", 
    message: "Print Service is running",
    version: "1.0.0",
    endpoints: {
      invoices: "/api/invoices",
      health: "/health"
    }
  });
});

// Invoice routes
app.use("/api/invoices", createInvoiceRoutes(invoiceController));

// Start server
async function startServer() {
  try {
    await dbConnection.connect();
    logger.info("Database connected successfully");
    
    app.listen(PORT, () => {
      logger.info(`Print Service running on port ${PORT}`);
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