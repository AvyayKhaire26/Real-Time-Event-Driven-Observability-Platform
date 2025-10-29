export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  service: string;
  dependencies?: Record<string, 'up' | 'down'>;
  uptime?: number;
}

export interface IHealthCheck {
  check(): Promise<HealthStatus>;
}
