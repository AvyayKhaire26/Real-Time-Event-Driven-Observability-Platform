import amqp from "amqplib/callback_api";
import { ILogger } from "@observability/core";

export interface RabbitMQConfig {
  url: string;
  exchange: {
    name: string;
    type: string;
    durable: boolean;
  };
  queues: {
    name: string;
    routingKey: string;
    durable: boolean;
  }[];
}

export class RabbitMQConnection {
  private connection: any;
  private channel: any;
  private config: RabbitMQConfig;
  private logger: ILogger;
  private isConnected: boolean = false;

  constructor(logger: ILogger, config: RabbitMQConfig) {
    this.logger = logger;
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      amqp.connect(this.config.url, (err: any, conn: any) => {
        if (err) {
          this.logger.error("Failed to connect to RabbitMQ", err);
          reject(err);
          return;
        }

        this.connection = conn;

        conn.createChannel((err: any, ch: any) => {
          if (err) {
            this.logger.error("Failed to create channel", err);
            reject(err);
            return;
          }

          this.channel = ch;
          this.logger.info("Connected to RabbitMQ and channel created");

          // Assert exchange
          ch.assertExchange(
            this.config.exchange.name,
            this.config.exchange.type,
            { durable: this.config.exchange.durable },
            (err: any) => {
              if (err) {
                this.logger.error("Failed to assert exchange", err);
                reject(err);
                return;
              }
              this.logger.info(`Exchange ${this.config.exchange.name} asserted`);
            }
          );

          // Assert queues and bind them
          let queueCount = 0;
          this.config.queues.forEach((queue) => {
            ch.assertQueue(queue.name, { durable: queue.durable }, (err: any) => {
              if (err) {
                this.logger.error(`Failed to assert queue ${queue.name}`, err);
                reject(err);
                return;
              }

              ch.bindQueue(
                queue.name,
                this.config.exchange.name,
                queue.routingKey,
                {},
                (err: any) => {
                  if (err) {
                    this.logger.error(`Failed to bind queue ${queue.name}`, err);
                    reject(err);
                    return;
                  }

                  this.logger.info(
                    `Queue ${queue.name} bound to ${queue.routingKey}`
                  );
                  queueCount++;

                  if (queueCount === this.config.queues.length) {
                    this.isConnected = true;
                    resolve();
                  }
                }
              );
            });
          });

          // Handle connection errors
          conn.on("error", (err: any) => {
            this.logger.error("RabbitMQ connection error", err);
            this.isConnected = false;
          });

          conn.on("close", () => {
            this.logger.warn("RabbitMQ connection closed");
            this.isConnected = false;
          });
        });
      });
    });
  }

  async publish(routingKey: string, message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.channel || !this.isConnected) {
        reject(new Error("RabbitMQ channel not connected"));
        return;
      }

      const payload = JSON.stringify(message);
      const published = this.channel.publish(
        this.config.exchange.name,
        routingKey,
        Buffer.from(payload),
        { persistent: true },
        (err: any) => {
          if (err) {
            this.logger.error(`Failed to publish to ${routingKey}`, err);
            reject(err);
          } else {
            this.logger.debug(`Message published to ${routingKey}`);
            resolve();
          }
        }
      );

      if (!published) {
        this.logger.warn("Channel write buffer full, message may be queued");
        resolve();
      }
    });
  }

  async consume(
    queueName: string,
    onMessage: (message: any) => Promise<void>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.channel || !this.isConnected) {
        reject(new Error("RabbitMQ channel not connected"));
        return;
      }

      this.channel.consume(
        queueName,
        async (msg: any) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              await onMessage(content);
              this.channel.ack(msg);
            } catch (error) {
              this.logger.error("Failed to process message", error as Error);
              this.channel.nack(msg, false, true); // Requeue on error
            }
          }
        },
        (err: any) => {
          if (err) {
            this.logger.error(`Failed to start consuming from ${queueName}`, err);
            reject(err);
          } else {
            this.logger.info(`Started consuming from queue: ${queueName}`);
            resolve();
          }
        }
      );
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.connection) {
          this.connection.close((err: any) => {
            if (err) {
              this.logger.error("Error closing RabbitMQ connection", err);
              reject(err);
            } else {
              this.isConnected = false;
              this.logger.info("Disconnected from RabbitMQ");
              resolve();
            }
          });
        } else {
          resolve();
        }
      } catch (error) {
        this.logger.error("Error during disconnect", error as Error);
        reject(error);
      }
    });
  }

  getChannel(): any {
    return this.channel;
  }

  isChannelConnected(): boolean {
    return this.isConnected;
  }
}