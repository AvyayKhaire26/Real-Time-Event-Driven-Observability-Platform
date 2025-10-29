export interface IMetricsCollector {
  recordMetric(name: string, value: number, labels?: Record<string, string>): void;
  incrementCounter(name: string, labels?: Record<string, string>): void;
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void;
}
