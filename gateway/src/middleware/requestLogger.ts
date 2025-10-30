import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { randomUUID } from "crypto";

export interface RequestWithTracking extends Request {
  startTime?: number;
  traceId?: string;
}

export const requestLogger = (
  req: RequestWithTracking,
  res: Response,
  next: NextFunction
) => {
  // Generate unique trace ID using built-in crypto
  req.traceId = randomUUID();
  req.startTime = Date.now();

  // Log incoming request
  logger.info("Incoming request", {
    traceId: req.traceId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("user-agent")
  });

  // Intercept response
  const originalSend = res.send;
  res.send = function (data: any) {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    logger.info("Outgoing response", {
      traceId: req.traceId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`
    });

    return originalSend.call(this, data);
  };

  next();
};