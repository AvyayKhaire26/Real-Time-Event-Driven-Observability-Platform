import { ILogger } from "@observability/core";
import { EventRepository } from "../repositories/EventRepository";
import * as amqp from "amqplib";

export class LogsConsumer {
  private logger: ILogger;
  private eventRepository: EventRepository;
  private queueName: string = "logs-queue";
  private channel: amqp.Channel | null = null;

  constructor(logger: ILogger, channel: amqp.Channel) {
    this.logger = logger;
    this.eventRepository = new EventRepository();
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

      this.logger.info(`Logs consumer started, listening on ${this.queueName}`);
    } catch (error) {
      this.logger.error("Failed to start logs consumer", error as Error);
      throw error;
    }
  }

  private async processMessage(message: any): Promise<void> {
    this.logger.debug("Processing logs message", {
      eventType: message.eventType,
      service: message.service,
      traceId: message.traceId
    });

    // Save event to database
    const savedEvent = await this.eventRepository.save(message);

    this.logger.info("Event saved to database", {
      id: savedEvent.id,
      eventType: savedEvent.eventType,
      service: savedEvent.service,
      traceId: savedEvent.traceId
    });
  }
}