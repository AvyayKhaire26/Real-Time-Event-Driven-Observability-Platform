import winston from "winston";

const logLevel = process.env.LOG_LEVEL || "info";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, service, traceId, ...meta }) => {
    // Add traceId if present in meta (or top-level)
    let traceIdStr = traceId
      ? `[traceId=${traceId}] `
      : (meta && meta.traceId ? `[traceId=${meta.traceId}] ` : '');
    let msg = `[${timestamp}] [${level}] [${service || "gateway"}] ${traceIdStr}${message}`;

    // Remove traceId from meta so it's not repeated
    if (meta && meta.traceId) {
      delete meta.traceId;
    }

    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: "api-gateway" },
  transports: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

export default logger;
