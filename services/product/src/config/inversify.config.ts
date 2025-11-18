import { Container } from "inversify";
import "reflect-metadata";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { ConsoleLogger, BaseHealthCheck, DatabaseConnection, IDatabaseConnection } from "@observability/common";
import { EventPublisher, RabbitMQConnection } from "@observability/common";
import { DataSourceOptions } from "typeorm";
import { Product } from "../entities/Product.entity";
import { IProductRepository, ProductRepository } from "../repositories/ProductRepository";
import { IProductService, ProductService } from "../services/ProductService";
import { ProductController } from "../controllers/ProductController";

const container = new Container();

const logger = new ConsoleLogger("product-service");
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);

container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck("product-service"));

const dbOptions: DataSourceOptions = {
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "observability_db",
    entities: [Product],
    synchronize: true,
    logging: false
};
const dbConnection = new DatabaseConnection(logger, dbOptions);

container.bind<IDatabaseConnection>("DatabaseConnection").toConstantValue(dbConnection);

container.bind<IProductRepository>("ProductRepository").toDynamicValue((context) => {
    const db = context.container.get<IDatabaseConnection>("DatabaseConnection");
    return new ProductRepository(db);
}).inSingletonScope();

// Synchronously construct RabbitMQConnection, EventPublisher (No async or await here)
const rabbitMQConfig = {
    url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    exchange: { name: "observability.events", type: "topic", durable: true },
    queues: []
};
const rabbitMQConnection = new RabbitMQConnection(logger, rabbitMQConfig);
container.bind<RabbitMQConnection>("RabbitMQConnection").toConstantValue(rabbitMQConnection);

const eventPublisher = new EventPublisher(logger, rabbitMQConnection, "product-service");
container.bind<EventPublisher>("EventPublisher").toConstantValue(eventPublisher);

container.bind<IProductService>("ProductService").to(ProductService).inSingletonScope();
container.bind<ProductController>("ProductController").to(ProductController).inSingletonScope();

export { container, dbConnection };
