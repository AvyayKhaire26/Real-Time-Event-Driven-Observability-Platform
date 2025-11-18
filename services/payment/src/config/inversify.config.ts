import { Container } from "inversify";
import "reflect-metadata";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { ConsoleLogger, BaseHealthCheck, DatabaseConnection, IDatabaseConnection } from "@observability/common";
import { EventPublisher, RabbitMQConnection } from "@observability/common";
import { DataSourceOptions } from "typeorm";
import { Payment } from "../entities/Payment.entity";
import { IPaymentRepository, PaymentRepository } from "../repositories/PaymentRepository";
import { IPaymentService, PaymentService } from "../services/PaymentService";
import { PaymentController } from "../controllers/PaymentController";

const container = new Container();

const logger = new ConsoleLogger("payment-service");
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);

container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck("payment-service"));

const dbOptions: DataSourceOptions = {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "observability_db",
    entities: [Payment],
    synchronize: true,
    logging: false
};
const dbConnection = new DatabaseConnection(logger, dbOptions);

container.bind<IDatabaseConnection>("DatabaseConnection").toConstantValue(dbConnection);

container.bind<IPaymentRepository>("PaymentRepository").toDynamicValue((context) => {
    const db = context.container.get<IDatabaseConnection>("DatabaseConnection");
    return new PaymentRepository(db);
}).inSingletonScope();

// RabbitMQ/EventPublisher
const rabbitMQConfig = {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    exchange: { name: "observability.events", type: "topic", durable: true },
    queues: []
};
const rabbitMQConnection = new RabbitMQConnection(logger, rabbitMQConfig);
container.bind<RabbitMQConnection>("RabbitMQConnection").toConstantValue(rabbitMQConnection);

const eventPublisher = new EventPublisher(logger, rabbitMQConnection, "payment-service");
container.bind<EventPublisher>("EventPublisher").toConstantValue(eventPublisher);

container.bind<IPaymentService>("PaymentService").to(PaymentService).inSingletonScope();
container.bind<PaymentController>("PaymentController").to(PaymentController).inSingletonScope();

export { container, dbConnection };
