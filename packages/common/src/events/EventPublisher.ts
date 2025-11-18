import { ILogger } from '@observability/core/src/interfaces/ILogger';
import { RabbitMQConnection } from '../rabbitmq/RabbitMQConnection';

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

    constructor(logger: ILogger, rabbitmq: RabbitMQConnection, serviceName: string) {
        this.logger = logger;
        this.rabbitmq = rabbitmq;
        this.serviceName = serviceName;
    }

    async publishEvent(
        eventType: string,
        data: any,
        traceId?: string,
        userId?: string
    ): Promise<void> {
        try {
            const event: EventPayload = {
                timestamp: new Date(),
                service: this.serviceName,
                eventType,
                data,
                traceId,
                userId,
            };

            // Select routing key based on event type, customize as needed
            let routingKey = "logs.default";
            if (
                eventType.includes("error") ||
                eventType.includes("failed") ||
                eventType.includes("success") ||
                eventType.includes("created") ||
                eventType.includes("updated")
            ) {
                routingKey = "logs.event";
            }

            await this.rabbitmq.publish(routingKey, event);
            this.logger.info(`Event published: ${eventType}`, { traceId, userId, event });
        } catch (error: any) {
            this.logger.error(`Failed to publish event: ${eventType}`, error, { traceId, userId, data });
        }
    }
}