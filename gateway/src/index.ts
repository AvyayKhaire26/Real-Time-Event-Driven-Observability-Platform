import express, { Application } from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import logger from "./utils/logger";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler } from "./middleware/errorHandler";
import healthRoutes from "./routes/health.routes";
import { setupServiceRoutes } from "./routes/serviceProxy";
import serviceRegistry from "./config/services.json";
import { ServiceRegistry } from "./types/service.types";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Trace-Id"]
}));

// Rate limiting
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

// Body parsing - MUST BE BEFORE PROXY
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Request logging middleware
app.use(requestLogger);

// Root endpoint
app.get("/", (req, res) => {
  const registry: ServiceRegistry = serviceRegistry;
  res.json({
    gateway: "Observability Platform API Gateway",
    version: "1.0.0",
    status: "running",
    uptime: process.uptime(),
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
    },
    documentation: "https://github.com/your-repo/observability-platform"
  });
});

// Health check routes
app.use("/health", healthRoutes);

// Service routes (dynamic proxy) - WITHOUT /api prefix
const registry: ServiceRegistry = serviceRegistry;
const serviceRouter = setupServiceRoutes(registry.services);
app.use("/", serviceRouter);

// 404 handler
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

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info("=".repeat(60));
  logger.info(`🚀 API Gateway started successfully`);
  logger.info(`📡 Port: ${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`📊 Registered Services: ${registry.services.length}`);
  logger.info("=".repeat(60));
  
  registry.services.forEach(service => {
    logger.info(`   ✓ ${service.name.padEnd(25)} → http://localhost:${PORT}${service.prefix}`);
  });
  
  logger.info("=".repeat(60));
  logger.info(`🔍 Health Check: http://localhost:${PORT}/health`);
  logger.info(`📖 Documentation: http://localhost:${PORT}/`);
  logger.info("=".repeat(60));
});

// Graceful shutdown
const gracefulShutdown = () => {
  logger.info("Received shutdown signal, closing server gracefully...");
  
  server.close(() => {
    logger.info("Server closed successfully");
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error("Forcing shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason, promise });
  process.exit(1);
});