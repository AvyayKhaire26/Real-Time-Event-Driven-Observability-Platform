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
  // Accept X-Trace-Id from upstream if present, otherwise generate new
  const incomingTraceId = req.header("X-Trace-Id");
  req.traceId = incomingTraceId ? incomingTraceId : randomUUID();
  req.startTime = Date.now();

  // Log incoming request with traceId and essentials
  logger.info("Incoming request", {
    traceId: req.traceId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get("user-agent")
  });

  // Intercept response to log outgoing with traceId
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

  // Also make traceId available to downstream handlers
  res.setHeader("X-Trace-Id", req.traceId);

  next();
};
