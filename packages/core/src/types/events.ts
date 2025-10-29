export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  service: string;
  traceId?: string;
}

export interface LogEvent extends BaseEvent {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: any;
}

export interface MetricEvent extends BaseEvent {
  metricName: string;
  value: number;
  unit?: string;
  labels?: Record<string, string>;
}

export interface TraceSpan extends BaseEvent {
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  duration: number;
  tags?: Record<string, any>;
}
