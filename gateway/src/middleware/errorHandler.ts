import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { RequestWithTracking } from "./requestLogger";

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

  res.status(500).json({
    success: false,
    message: "Internal gateway error",
    traceId: req.traceId,
    error: process.env.NODE_ENV === "development" ? err.message : undefined
  });
};