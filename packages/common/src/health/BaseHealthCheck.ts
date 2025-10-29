import { injectable } from 'inversify';
import { IHealthCheck, HealthStatus } from '@observability/core';

@injectable()
export class BaseHealthCheck implements IHealthCheck {
  private serviceName: string;
  private startTime: Date;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.startTime = new Date();
  }

  async check(): Promise<HealthStatus> {
    const uptime = Date.now() - this.startTime.getTime();
    
    return {
      status: 'healthy',
      timestamp: new Date(),
      service: this.serviceName,
      uptime: Math.floor(uptime / 1000),
      dependencies: {}
    };
  }
}
