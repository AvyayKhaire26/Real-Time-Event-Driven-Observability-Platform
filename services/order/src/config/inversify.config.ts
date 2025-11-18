import { Container } from "inversify";
import "reflect-metadata";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { ConsoleLogger, BaseHealthCheck, DatabaseConnection, IDatabaseConnection } from "@observability/common";
import { EventPublisher, RabbitMQConnection } from "@observability/common";
import { DataSourceOptions } from "typeorm";
import { Order } from "../entities/Order.entity";
import { IOrderRepository, OrderRepository } from "../repositories/OrderRepository";
import { IOrderService, OrderService } from "../services/OrderService";
import { OrderController } from "../controllers/OrderController";

const container = new Container();

const logger = new ConsoleLogger("order-service");
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);

container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck("order-service"));

const dbOptions: DataSourceOptions = {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "observability_db",
    entities: [Order],
    synchronize: true,
    logging: false
};
const dbConnection = new DatabaseConnection(logger, dbOptions);

container.bind<IDatabaseConnection>("DatabaseConnection").toConstantValue(dbConnection);

container.bind<IOrderRepository>("OrderRepository").toDynamicValue((context) => {
    const db = context.container.get<IDatabaseConnection>("DatabaseConnection");
    return new OrderRepository(db);
}).inSingletonScope();

// Synchronously construct RabbitMQConnection, EventPublisher (No async or await here)
const rabbitMQConfig = {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    exchange: { name: "observability.events", type: "topic", durable: true },
    queues: []
};
const rabbitMQConnection = new RabbitMQConnection(logger, rabbitMQConfig);
container.bind<RabbitMQConnection>("RabbitMQConnection").toConstantValue(rabbitMQConnection);

const eventPublisher = new EventPublisher(logger, rabbitMQConnection, "order-service");
container.bind<EventPublisher>("EventPublisher").toConstantValue(eventPublisher);

container.bind<IOrderService>("OrderService").to(OrderService).inSingletonScope();
container.bind<OrderController>("OrderController").to(OrderController).inSingletonScope();

export { container, dbConnection };

