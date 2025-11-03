import { RabbitMQConnection, RabbitMQConfig } from "./RabbitMQConnection";
import { EventPublisher } from "../events/EventPublisher";
import { ILogger } from "@observability/core";
import { ConfigLoader } from "../config/ConfigLoader";

export class RabbitMQHelper {
  private static instance: RabbitMQConnection | null = null;
  private static publishers: Map<string, EventPublisher> = new Map();

  static async getConnection(logger: ILogger): Promise<RabbitMQConnection> {
    if (!this.instance) {
      const configLoader = ConfigLoader.getInstance();
      const config = configLoader.loadConfig<RabbitMQConfig>("rabbitmq-config");
      
      this.instance = new RabbitMQConnection(logger, config);
      await this.instance.connect();
    }
    return this.instance;
  }

  static async getPublisher(
    logger: ILogger,
    serviceName: string
  ): Promise<EventPublisher> {
    if (!this.publishers.has(serviceName)) {
      const connection = await this.getConnection(logger);
      const publisher = new EventPublisher(logger, connection, serviceName);
      this.publishers.set(serviceName, publisher);
    }
    return this.publishers.get(serviceName)!;
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await this.instance.disconnect();
      this.instance = null;
      this.publishers.clear();
    }
  }
}