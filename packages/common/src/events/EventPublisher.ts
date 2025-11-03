import { RabbitMQConnection } from "../rabbitmq/RabbitMQConnection";
import { ILogger } from "@observability/core";

export interface EventPayload {
  timestamp: Date;
  service: string;
  eventType: string;
  data: any;
  traceId?: string;
  userId?: string;
}

export class EventPublisher {
  private rabbitmq: RabbitMQConnection;
  private logger: ILogger;
  private serviceName: string;

  constructor(
    logger: ILogger,
    rabbitmq: RabbitMQConnection,
    serviceName: string
  ) {
    this.logger = logger;
    this.rabbitmq = rabbitmq;
    this.serviceName = serviceName;
  }

  async publishEvent(
    eventType: string,
    data: any,
    traceId?: string
  ): Promise<void> {
    try {
      const event: EventPayload = {
        timestamp: new Date(),
        service: this.serviceName,
        eventType,
        data,
        traceId
      };

      // Determine routing key based on event type
      let routingKey = "logs.default";
      
      if (eventType.includes("success") || eventType.includes("failed")) {
        routingKey = "logs.event";
      } else if (eventType.includes("created") || eventType.includes("updated")) {
        routingKey = "logs.event";
      }

      await this.rabbitmq.publish(routingKey, event);
      
      this.logger.info(`Event published: ${eventType}`, { traceId });
    } catch (error) {
      this.logger.error(`Failed to publish event ${eventType}`, error as Error);
    }
  }

  async publishMetric(
    metricName: string,
    value: number,
    labels?: Record<string, string>
  ): Promise<void> {
    try {
      const metric = {
        timestamp: new Date(),
        service: this.serviceName,
        metricName,
        value,
        labels
      };

      await this.rabbitmq.publish("metrics.service", metric);
    } catch (error) {
      this.logger.error(
        `Failed to publish metric ${metricName}`,
        error as Error
      );
    }
  }

  async publishTrace(
    traceId: string,
    spanName: string,
    duration: number,
    status: "success" | "error",
    error?: string
  ): Promise<void> {
    try {
      const trace = {
        timestamp: new Date(),
        service: this.serviceName,
        traceId,
        spanName,
        duration,
        status,
        error
      };

      await this.rabbitmq.publish("traces.span", trace);
    } catch (error) {
      this.logger.error("Failed to publish trace", error as Error);
    }
  }
}