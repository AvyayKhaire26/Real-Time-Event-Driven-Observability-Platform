export interface ServiceConfig {
  name: string;
  url: string;
  prefix: string;
  healthCheck: string;
  timeout: number;
  retries: number;
  circuitBreaker: {
    enabled: boolean;
    threshold?: number;
    timeout?: number;
  };
}

export interface ServiceRegistry {
  services: ServiceConfig[];
}

export interface HealthStatus {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

export interface GatewayHealth {
  gateway: string;
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  services: HealthStatus[];
  timestamp: Date;
}

export interface RequestLog {
  timestamp: Date;
  method: string;
  path: string;
  targetService: string;
  statusCode: number;
  responseTime: number;
  clientIp: string;
  userAgent: string;
  traceId: string;
}