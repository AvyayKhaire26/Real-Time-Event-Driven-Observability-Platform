import "reflect-metadata";
import express from "express";
import dotenv from "dotenv";
import { container, dbConnection } from "./config/inversify.config";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { PaymentController } from "./controllers/PaymentController";
import { createPaymentRoutes } from "./routes/payment.routes";
import { EventPublisher, RabbitMQConnection } from "@observability/common";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

const logger = container.get<ILogger>(TYPES.Logger);
const healthCheck = container.get<IHealthCheck>(TYPES.HealthCheck);
const paymentController = container.get<PaymentController>("PaymentController");
const eventPublisher = container.get<EventPublisher>("EventPublisher");
const rabbitMQConnection = container.get<RabbitMQConnection>("RabbitMQConnection");

async function startServer() {
    try {
        await dbConnection.connect();
        logger.info("Database connected successfully");

        logger.info("Connecting to RabbitMQ...");
        await rabbitMQConnection.connect();
        logger.info("RabbitMQ connected successfully");

        app.get("/health", async (req, res) => {
            const health = await healthCheck.check();
            res.json(health);
        });

        app.get("/", (req, res) => {
            logger.info("Root endpoint accessed");
            res.json({
                service: "Payment Service",
                message: "Payment Service is running with 20% simulated failure rate",
                version: "1.0.0",
                endpoints: {
                    payments: "/api/payments",
                    health: "/health"
                },
                note: "This service simulates random payment failures for anomaly detection demo"
            });
        });

        app.use("/api/payments", createPaymentRoutes(paymentController));

        app.listen(PORT, () => {
            logger.info(`Payment Service running on port ${PORT}`);
        });
    } catch (error) {
        logger.error("Failed to start server", error as Error);
        process.exit(1);
    }
}

// Graceful shutdown
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
