import { injectable } from 'inversify';
import { ILogger } from '@observability/core';

@injectable()
export class ConsoleLogger implements ILogger {
  private serviceName: string;

  constructor(serviceName: string = 'unknown') {
    this.serviceName = serviceName;
  }

  info(message: string, meta?: { traceId?: string; [key: string]: any }): void {
    console.log(`[INFO] [${this.serviceName}]${meta?.traceId ? ` [traceId=${meta.traceId}]` : ''} ${message}`, meta || "");
  }

  error(message: string, error?: Error, meta?: { traceId?: string; [key: string]: any }): void {
    console.error(
      `[ERROR] [${this.serviceName}]${meta?.traceId ? ` [traceId=${meta.traceId}]` : ''} ${message}`,
      error?.message || "",
      meta || ""
    );
  }

  warn(message: string, meta?: { traceId?: string; [key: string]: any }): void {
    console.warn(`[WARN] [${this.serviceName}]${meta?.traceId ? ` [traceId=${meta.traceId}]` : ''} ${message}`, meta || "");
  }

  debug(message: string, meta?: { traceId?: string; [key: string]: any }): void {
    console.debug(`[DEBUG] [${this.serviceName}]${meta?.traceId ? ` [traceId=${meta.traceId}]` : ''} ${message}`, meta || "");
  }
}
