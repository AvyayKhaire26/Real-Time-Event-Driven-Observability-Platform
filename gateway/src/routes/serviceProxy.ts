import { Router } from "express";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { ServiceConfig } from "../types/service.types";
import { circuitBreakerRegistry } from "../utils/circuitBreaker";
import logger from "../utils/logger";
import { RequestWithTracking } from "../middleware/requestLogger";

export function createServiceProxy(service: ServiceConfig): Router {
  const router = Router();

  // Get or create circuit breaker for this service
  let circuitBreaker;
  if (service.circuitBreaker.enabled) {
    circuitBreaker = circuitBreakerRegistry.getOrCreate(service.name, {
      threshold: service.circuitBreaker.threshold || 5,
      timeout: service.circuitBreaker.timeout || 30000
    });
  }

  const proxyOptions: Options = {
    target: service.url,
    changeOrigin: true,
    pathRewrite: (path) => {
      // Simply prepend /api to the path
      // Example: /products → /api/products
      const newPath = `/api${path}`;
      logger.debug(`Path rewrite`, {
        original: path,
        rewritten: newPath,
        service: service.name
      });
      return newPath;
    },
    timeout: service.timeout,
    
    onProxyReq: (proxyReq, req: any) => {
      // Add trace ID to forwarded request
      if (req.traceId) {
        proxyReq.setHeader("X-Trace-Id", req.traceId);
        proxyReq.setHeader("X-Gateway", "observability-gateway");
      }

      // IMPORTANT: Forward request body for POST/PUT/PATCH
      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    
    onProxyRes: (proxyRes, req: any, res) => {
      logger.info(`Service responded`, {
        traceId: req.traceId,
        service: service.name,
        statusCode: proxyRes.statusCode,
        method: req.method,
        path: req.path
      });
    },
    
    onError: (err, req: any, res: any) => {
      logger.error(`Proxy error for ${service.name}`, {
        traceId: req.traceId,
        error: err.message,
        path: req.path,
        method: req.method
      });

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: `Service ${service.name} unavailable`,
          traceId: req.traceId,
          error: err.message
        });
      }
    }
  };

  // Middleware to check circuit breaker before proxying
  if (circuitBreaker) {
    router.use((req: any, res, next) => {
      if (circuitBreaker!.isOpen()) {
        logger.warn(`Request blocked by circuit breaker`, {
          traceId: req.traceId,
          service: service.name,
          path: req.path
        });

        return res.status(503).json({
          success: false,
          message: `Service ${service.name} temporarily unavailable (circuit breaker open)`,
          traceId: req.traceId,
          retryAfter: Math.ceil(service.circuitBreaker.timeout! / 1000)
        });
      }
      next();
    });
  }

  // Apply proxy middleware
  router.use(createProxyMiddleware(proxyOptions));

  return router;
}

export function setupServiceRoutes(services: ServiceConfig[]): Router {
  const mainRouter = Router();

  services.forEach(service => {
    logger.info(`Setting up route for ${service.name}`, {
      prefix: service.prefix,
      target: service.url
    });

    const serviceRouter = createServiceProxy(service);
    mainRouter.use(service.prefix, serviceRouter);
  });

  return mainRouter;
}