export interface ILogger {
  info(message: string, meta?: { traceId?: string; [key: string]: any }): void;
  error(message: string, error?: Error, meta?: { traceId?: string; [key: string]: any }): void;
  warn(message: string, meta?: { traceId?: string; [key: string]: any }): void;
  debug(message: string, meta?: { traceId?: string; [key: string]: any }): void;
}
