import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { container } from "./config/inversify.config";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

const logger = container.get<ILogger>(TYPES.Logger);
const healthCheck = container.get<IHealthCheck>(TYPES.HealthCheck);

app.get("/health", async (req, res) => {
  const health = await healthCheck.check();
  res.json(health);
});

app.get("/", (req, res) => {
  logger.info("Root endpoint accessed");
  res.json({ 
    service: "Notification Service", 
    message: "Notification Service is running",
    version: "1.0.0"
  });
});

app.listen(PORT, () => {
  logger.info(`Notification Service running on port ${PORT}`);
});