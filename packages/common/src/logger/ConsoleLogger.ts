import { injectable } from 'inversify';
import { ILogger } from '@observability/core';

@injectable()
export class ConsoleLogger implements ILogger {
  private serviceName: string;

  constructor(serviceName: string = 'unknown') {
    this.serviceName = serviceName;
  }

  info(message: string, meta?: any): void {
    console.log(`[INFO] [${this.serviceName}] ${message}`, meta || '');
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(`[ERROR] [${this.serviceName}] ${message}`, error?.message || '', meta || '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] [${this.serviceName}] ${message}`, meta || '');
  }

  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] [${this.serviceName}] ${message}`, meta || '');
  }
}
