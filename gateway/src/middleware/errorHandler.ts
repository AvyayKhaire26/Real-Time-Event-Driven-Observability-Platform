import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { RequestWithTracking } from "./requestLogger";
import { EventPublisher } from "@observability/common";

export const errorHandler = (
  err: Error,
  req: RequestWithTracking,
  res: Response,
  next: NextFunction
) => {
  logger.error("Gateway error", {
    traceId: req.traceId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Optionally publish system error events
  if ((req as any).eventPublisher) {
    (req as any).eventPublisher.publishEvent(
      "gateway.error",
      {
        path: req.path,
        method: req.method,
        error: err.message,
        stack: err.stack,
      },
      req.traceId
    );
  }

  res.status(500).json({
    success: false,
    message: "Internal gateway error",
    traceId: req.traceId,
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
};
