import { Router } from "express";
import { createProxyMiddleware, Options } from "http-proxy-middleware";
import { ServiceConfig } from "../types/service.types";
import { circuitBreakerRegistry } from "../utils/circuitBreaker";
import logger from "../utils/logger";
import { RequestWithTracking } from "../middleware/requestLogger";
import { getEventPublisher } from "../middleware/eventPublisher";

export function createServiceProxy(service: ServiceConfig): Router {
  const router = Router();

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
      const newPath = `/api${path}`;
      logger.debug(`Path rewrite`, {
        original: path,
        rewritten: newPath,
        service: service.name
      });
      return newPath;
    },
    timeout: service.timeout,
    selfHandleResponse: true,

    onProxyReq: (proxyReq, req: any) => {
      req.proxyStartTime = Date.now();
      req.targetService = service.name;

      if (req.traceId) {
        proxyReq.setHeader("X-Trace-Id", req.traceId);
        proxyReq.setHeader("X-Gateway", "observability-gateway");
      }

      if (req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader("Content-Type", "application/json");
        proxyReq.setHeader("Content-Length", Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },

    onProxyRes: (proxyRes, req: any, res) => {
      const duration = Date.now() - (req.proxyStartTime || Date.now());
      const statusCode = proxyRes.statusCode || 500;
      const serviceName = req.targetService || service.name;

      let responseBody = "";
      proxyRes.on("data", (chunk) => {
        responseBody += chunk.toString("utf8");
      });

      proxyRes.on("end", () => {
        logger.info(`Service responded`, {
          traceId: req.traceId,
          service: serviceName,
          statusCode,
          method: req.method,
          path: req.path,
          duration: `${duration}ms`
        });

        const publisher = getEventPublisher();

        if (publisher && publisher.isReady()) {
          let parsedResponse;
          try {
            parsedResponse = JSON.parse(responseBody);
          } catch (e) {
            parsedResponse = null;
          }

          // 1. Request/Response Event
          const requestEvent = {
            eventType: "request.completed",
            timestamp: new Date().toISOString(),
            traceId: req.traceId,
            service: serviceName,
            method: req.method,
            path: req.path,
            statusCode,
            duration,
            requestBody: req.method !== "GET" ? req.body : undefined,
            responseBody: statusCode < 400 ? parsedResponse : undefined,
            responseSize: responseBody.length,
            clientIp: req.ip,
            userAgent: req.get("user-agent")
          };

          publisher.publishEvent("logs.request", requestEvent);

          // 2. Service Metrics Event ✅ NOW WITH TRACEID
          const metricsEvent = {
            eventType: "metric.service",
            timestamp: new Date().toISOString(),
            traceId: req.traceId,  // ✅ Added traceId
            service: serviceName,
            method: req.method,     // ✅ Added method
            path: req.path,         // ✅ Added path
            metrics: {
              response_time_ms: duration,
              status_code: statusCode,
              request_count: 1,
              error_count: statusCode >= 400 ? 1 : 0,
              response_size_bytes: responseBody.length
            }
          };

          publisher.publishEvent("metrics.service", metricsEvent);

          // 3. Error Event (if status >= 400)
          if (statusCode >= 400) {
            // ✅ Enhanced error message extraction
            let errorMessage = "Unknown error";
            let errorDetails = null;

            if (parsedResponse) {
              // Try multiple common error fields
              errorMessage = 
                parsedResponse.message || 
                parsedResponse.error || 
                parsedResponse.msg || 
                `HTTP ${statusCode}`;
              errorDetails = parsedResponse;
            } else if (responseBody) {
              // Non-JSON response - use body as error message
              errorMessage = responseBody.substring(0, 255); // Limit length
              errorDetails = { rawBody: responseBody };
            } else {
              // Empty body
              errorMessage = `HTTP ${statusCode} ${req.method} ${req.path}`;
              errorDetails = {
                statusCode,
                method: req.method,
                path: req.path
              };
            }

            const errorEvent = {
              eventType: "error.occurred",
              timestamp: new Date().toISOString(),
              traceId: req.traceId,
              service: serviceName,
              endpoint: req.path,
              method: req.method,
              statusCode,
              errorMessage,
              errorDetails,
              requestBody: req.body
            };

            publisher.publishEvent("logs.error", errorEvent);
          }

          logger.debug("✅ Events published", {
            traceId: req.traceId,
            service: serviceName,
            statusCode,
            eventsPublished: statusCode >= 400 ? 3 : 2
          });
        }

        res.statusCode = statusCode;
        Object.keys(proxyRes.headers).forEach((key) => {
          res.setHeader(key, proxyRes.headers[key]!);
        });
        res.end(responseBody);
      });
    },

    onError: (err, req: any, res: any) => {
      const duration = Date.now() - (req.proxyStartTime || Date.now());
      const serviceName = req.targetService || service.name;

      logger.error(`Proxy error for ${serviceName}`, {
        traceId: req.traceId,
        error: err.message,
        path: req.path,
        method: req.method,
        duration: `${duration}ms`
      });

      const publisher = getEventPublisher();
      if (publisher && publisher.isReady()) {
        const errorEvent = {
          eventType: "error.occurred",
          timestamp: new Date().toISOString(),
          traceId: req.traceId,
          service: serviceName,
          endpoint: req.path,
          method: req.method,
          statusCode: 503,
          errorMessage: err.message,
          errorType: "ProxyError",
          errorDetails: {
            errorType: "ProxyError",
            message: err.message,
            stack: err.stack
          },
          requestBody: req.body
        };

        publisher.publishEvent("logs.error", errorEvent);
      }

      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          message: `Service ${serviceName} unavailable`,
          traceId: req.traceId,
          error: err.message
        });
      }
    }
  };

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