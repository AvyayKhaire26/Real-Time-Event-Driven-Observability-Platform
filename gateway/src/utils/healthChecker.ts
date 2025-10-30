import axios from "axios";
import { ServiceConfig, HealthStatus } from "../types/service.types";
import logger from "./logger";

export class HealthChecker {
  private healthCache: Map<string, HealthStatus> = new Map();

  async checkService(service: ServiceConfig): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${service.url}${service.healthCheck}`, {
        timeout: 10000  // Increased from 3000ms to 10000ms
      });
      
      const responseTime = Date.now() - startTime;
      const status: HealthStatus = {
        service: service.name,
        status: response.status === 200 ? "healthy" : "degraded",
        responseTime,
        lastCheck: new Date()
      };

      this.healthCache.set(service.name, status);
      return status;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const status: HealthStatus = {
        service: service.name,
        status: "unhealthy",
        responseTime,
        lastCheck: new Date(),
        error: error.message
      };

      this.healthCache.set(service.name, status);
      logger.warn(`Health check failed for ${service.name}`, {
        error: error.message
      });
      
      return status;
    }
  }

  async checkAllServices(services: ServiceConfig[]): Promise<HealthStatus[]> {
    const healthChecks = services.map(service => this.checkService(service));
    return Promise.all(healthChecks);
  }

  getCachedHealth(serviceName: string): HealthStatus | undefined {
    return this.healthCache.get(serviceName);
  }
}

export const healthChecker = new HealthChecker();