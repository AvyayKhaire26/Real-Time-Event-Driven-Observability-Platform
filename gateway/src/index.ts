import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import logger from "./utils/logger";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import { initializeEventPublisher } from "./middleware/eventPublisher";
import healthRoutes from "./routes/health.routes";
import { setupServiceRoutes } from "./routes/serviceProxy";
import serviceRegistry from "./config/services.json";
import { ServiceRegistry } from "./types/service.types";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Trace-Id"]
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(requestLogger);

// NOTE: Event publishing happens INSIDE proxy hooks (serviceProxy.ts)
// NOT as separate middleware

app.get("/", (req, res) => {
  const registry: ServiceRegistry = serviceRegistry;
  res.json({
    gateway: "Observability Platform API Gateway",
    version: "1.0.0",
    status: "running",
    uptime: process.uptime(),
    eventsEnabled: process.env.EVENTS_ENABLED === "true",
    registeredServices: registry.services.map(s => ({
      name: s.name,
      prefix: s.prefix,
      url: s.url
    })),
    endpoints: {
      health: "/health",
      services: registry.services.map(s => s.prefix)
    },
    exampleRequests: {
      getProducts: "GET /products",
      createOrder: "POST /orders",
      processPayment: "POST /payments/process",
      sendNotification: "POST /notifications/send",
      generateInvoice: "POST /invoices/generate",
      getInvoices: "GET /invoices"
    }
  });
});

app.use("/health", healthRoutes);

const registry: ServiceRegistry = serviceRegistry;
const serviceRouter = setupServiceRoutes(registry.services);
app.use("/", serviceRouter);

app.use((req, res) => {
  logger.warn("Route not found", {
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.path,
    availableRoutes: registry.services.map(s => `${s.prefix}`)
  });
});

app.use(errorHandler);

async function startServer() {
  try {
    const eventPublisher = initializeEventPublisher({
      enabled: process.env.EVENTS_ENABLED === "true",
      rabbitmqUrl: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
      exchange: process.env.RABBITMQ_EXCHANGE || "observability.events"
    });

    if (process.env.EVENTS_ENABLED === "true") {
      await eventPublisher.connect();
    }

    const server = app.listen(PORT, () => {
      logger.info("=".repeat(60));
      logger.info(`🚀 API Gateway started successfully`);
      logger.info(`📡 Port: ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`📊 Registered Services: ${registry.services.length}`);
      logger.info(`📤 Events: ${process.env.EVENTS_ENABLED === "true" ? "ENABLED" : "DISABLED"}`);
      logger.info("=".repeat(60));

      registry.services.forEach(service => {
        logger.info(`   ✓ ${service.name.padEnd(25)} → http://localhost:${PORT}${service.prefix}`);
      });

      logger.info("=".repeat(60));
      logger.info(`🔍 Health Check: http://localhost:${PORT}/health`);
      logger.info(`📖 Documentation: http://localhost:${PORT}/`);
      logger.info("=".repeat(60));
    });

    const gracefulShutdown = async () => {
      logger.info("Received shutdown signal, closing server gracefully...");
      await eventPublisher.disconnect();
      server.close(() => {
        logger.info("Server closed successfully");
        process.exit(0);
      });

      setTimeout(() => {
        logger.error("Forcing shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  } catch (error) {
    logger.error("Failed to start server", error as Error);
    process.exit(1);
  }
}

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason, promise });
  process.exit(1);
});

startServer();