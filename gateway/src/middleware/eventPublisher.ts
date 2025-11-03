import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";
import { RequestWithTracking } from "./requestLogger";

interface EventPublisherConfig {
  enabled: boolean;
  rabbitmqUrl: string;
  exchange: string;
}

export class GatewayEventPublisher {
  private rabbitmq: any = null;
  private channel: any = null;
  private config: EventPublisherConfig;
  private isConnected: boolean = false;

  constructor(config: EventPublisherConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    if (!this.config.enabled) {
      logger.info("Event publishing disabled");
      return;
    }

    try {
      const amqp = require("amqplib/callback_api");

      return new Promise((resolve, reject) => {
        amqp.connect(this.config.rabbitmqUrl, (err: any, conn: any) => {
          if (err) {
            logger.error("Failed to connect to RabbitMQ", err);
            reject(err);
            return;
          }

          this.rabbitmq = conn;
          logger.info("Connected to RabbitMQ");

          conn.createChannel((err: any, ch: any) => {
            if (err) {
              logger.error("Failed to create channel", err);
              reject(err);
              return;
            }

            this.channel = ch;
            logger.info("RabbitMQ channel created");

            // 1. Assert exchange
            ch.assertExchange(
              this.config.exchange,
              "topic",
              { durable: true },
              (err: any) => {
                if (err) {
                  logger.error("Failed to assert exchange", err);
                  reject(err);
                  return;
                }
                logger.info(`Exchange ${this.config.exchange} asserted`);

                // 2. Assert queues and bind them
                const queues = [
                  { name: "logs-queue", routingKey: "logs.*" },
                  { name: "metrics-queue", routingKey: "metrics.*" },
                  { name: "traces-queue", routingKey: "traces.*" }
                ];

                let queueCount = 0;

                queues.forEach((queue) => {
                  ch.assertQueue(queue.name, { durable: true }, (err: any) => {
                    if (err) {
                      logger.error(`Failed to assert queue ${queue.name}`, err);
                      reject(err);
                      return;
                    }

                    logger.info(`Queue ${queue.name} created`);

                    ch.bindQueue(
                      queue.name,
                      this.config.exchange,
                      queue.routingKey,
                      {},
                      (err: any) => {
                        if (err) {
                          logger.error(`Failed to bind queue ${queue.name}`, err);
                          reject(err);
                          return;
                        }

                        logger.info(`Queue ${queue.name} bound to ${queue.routingKey}`);
                        queueCount++;

                        if (queueCount === queues.length) {
                          this.isConnected = true;
                          logger.info("✅ All queues ready for event publishing");
                          resolve();
                        }
                      }
                    );
                  });
                });
              }
            );
          });
        });
      });
    } catch (error) {
      logger.error("Failed to connect event publisher", error as Error);
      throw error;
    }
  }

  publishEvent(routingKey: string, event: any): void {
    if (!this.config.enabled || !this.isConnected || !this.channel) {
      logger.warn("Cannot publish event - not connected", {
        enabled: this.config.enabled,
        isConnected: this.isConnected,
        hasChannel: !!this.channel
      });
      return;
    }

    try {
      const payload = JSON.stringify(event);
      const published = this.channel.publish(
        this.config.exchange,
        routingKey,
        Buffer.from(payload),
        { persistent: true }
      );

      if (published) {
        logger.info(`✅ Event published to ${routingKey}`, {
          eventType: event.eventType,
          traceId: event.traceId
        });
      } else {
        logger.warn(`⚠️  Event buffered for ${routingKey} (channel full)`);
      }
    } catch (error) {
      logger.error(`❌ Failed to publish event to ${routingKey}`, error as Error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.rabbitmq) {
      await this.rabbitmq.close();
      this.isConnected = false;
      logger.info("Gateway event publisher disconnected");
    }
  }

  isReady(): boolean {
    return this.isConnected && !!this.channel;
  }
}

let eventPublisher: GatewayEventPublisher | null = null;

export function initializeEventPublisher(
  config: EventPublisherConfig
): GatewayEventPublisher {
  eventPublisher = new GatewayEventPublisher(config);
  return eventPublisher;
}

export function getEventPublisher(): GatewayEventPublisher | null {
  return eventPublisher;
}

export function createEventPublishingMiddleware() {
  return (
    req: RequestWithTracking,
    res: Response,
    next: NextFunction
  ) => {
    logger.debug("Event middleware triggered", {
      path: req.path,
      method: req.method,
      traceId: req.traceId
    });

    const startTime = Date.now();
    const originalSend = res.send.bind(res);

    res.send = function (data: any): Response {
      const duration = Date.now() - startTime;
      const publisher = getEventPublisher();

      logger.debug("Response being sent, attempting to publish events", {
        path: req.path,
        statusCode: res.statusCode,
        hasPublisher: !!publisher,
        publisherReady: publisher?.isReady()
      });

      if (publisher && publisher.isReady()) {
        // Determine target service from path
        const pathParts = req.path.split("/").filter(Boolean);
        const service = pathParts[0] || "unknown";

        // 1. Request/Response Event
        const requestEvent = {
          eventType: "request.completed",
          timestamp: new Date().toISOString(),
          traceId: req.traceId,
          service: service,
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration,
          requestBody: req.method !== "GET" ? req.body : undefined,
          clientIp: req.ip,
          userAgent: req.get("user-agent")
        };

        publisher.publishEvent("logs.request", requestEvent);

        // 2. Service Metrics Event
        const metricsEvent = {
          eventType: "metric.service",
          timestamp: new Date().toISOString(),
          service: service,
          metrics: {
            response_time_ms: duration,
            status_code: res.statusCode,
            request_count: 1,
            error_count: res.statusCode >= 400 ? 1 : 0
          }
        };

        publisher.publishEvent("metrics.service", metricsEvent);

        // 3. Error Event (if status >= 400)
        if (res.statusCode >= 400) {
          const errorEvent = {
            eventType: "error.occurred",
            timestamp: new Date().toISOString(),
            traceId: req.traceId,
            service: service,
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            errorMessage: "Error occurred",
            requestBody: req.body
          };

          publisher.publishEvent("logs.error", errorEvent);
        }
      } else {
        logger.warn("⚠️  Publisher not ready, events not published", {
          path: req.path,
          traceId: req.traceId
        });
      }

      return originalSend(data);
    };

    next();
  };
}