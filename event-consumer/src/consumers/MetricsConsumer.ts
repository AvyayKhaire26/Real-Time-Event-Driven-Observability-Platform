import { ILogger } from "@observability/core";
import { MetricRepository } from "../repositories/MetricRepository";
import * as amqp from "amqplib";

export class MetricsConsumer {
  private logger: ILogger;
  private metricRepository: MetricRepository;
  private queueName: string = "metrics-queue";
  private channel: amqp.Channel | null = null;

  constructor(logger: ILogger, channel: amqp.Channel) {
    this.logger = logger;
    this.metricRepository = new MetricRepository();
    this.channel = channel;
  }

  async start(): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error("RabbitMQ channel not initialized");
      }

      // Set prefetch count
      this.channel.prefetch(10);

      // Start consuming
      this.channel.consume(
        this.queueName,
        async (msg) => {
          if (msg) {
            try {
              const content = msg.content.toString();
              const message = JSON.parse(content);
              
              await this.processMessage(message);
              
              // Acknowledge message
              this.channel!.ack(msg);
            } catch (error) {
              this.logger.error("Error processing message", error as Error);
              // Reject and requeue
              this.channel!.nack(msg, false, true);
            }
          }
        },
        { noAck: false }
      );

      this.logger.info(`Metrics consumer started, listening on ${this.queueName}`);
    } catch (error) {
      this.logger.error("Failed to start metrics consumer", error as Error);
      throw error;
    }
  }

  private async processMessage(message: any): Promise<void> {
    this.logger.debug("Processing metrics message", {
      service: message.service,
      responseTime: message.metrics.response_time_ms
    });

    // Save metric to database
    const savedMetric = await this.metricRepository.save(message);

    this.logger.info("Metric saved to database", {
      id: savedMetric.id,
      service: savedMetric.service,
      responseTime: savedMetric.responseTimeMs
    });
  }
}