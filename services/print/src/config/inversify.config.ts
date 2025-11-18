import { Container } from "inversify";
import "reflect-metadata";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { ConsoleLogger, BaseHealthCheck, DatabaseConnection, IDatabaseConnection } from "@observability/common";
import { EventPublisher, RabbitMQConnection } from "@observability/common";
import { DataSourceOptions } from "typeorm";
import { Invoice } from "../entities/Invoice.entity";
import { IInvoiceRepository, InvoiceRepository } from "../repositories/InvoiceRepository";
import { IInvoiceService, InvoiceService } from "../services/InvoiceService";
import { InvoiceController } from "../controllers/InvoiceController";

const container = new Container();

// Infrastructure
const logger = new ConsoleLogger("print-service");
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);
container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck("print-service"));

// Database Configuration
const dbOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "observability_db",
  entities: [Invoice],
  synchronize: true,
  logging: false
};

const dbConnection = new DatabaseConnection(logger, dbOptions);
container.bind<IDatabaseConnection>("DatabaseConnection").toConstantValue(dbConnection);

// Repository
container.bind<IInvoiceRepository>("InvoiceRepository").toDynamicValue((context) => {
  const db = context.container.get<IDatabaseConnection>("DatabaseConnection");
  return new InvoiceRepository(db);
}).inSingletonScope();

// RabbitMQ/EventPublisher setup (copying pattern from payment-service)
const rabbitMQConfig = {
  url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
  exchange: { name: "observability.events", type: "topic", durable: true },
  queues: []
};
const rabbitMQConnection = new RabbitMQConnection(logger, rabbitMQConfig);
container.bind<RabbitMQConnection>("RabbitMQConnection").toConstantValue(rabbitMQConnection);

const eventPublisher = new EventPublisher(logger, rabbitMQConnection, "print-service");
container.bind<EventPublisher>("EventPublisher").toConstantValue(eventPublisher);

// Service/Controller
container.bind<IInvoiceService>("InvoiceService").to(InvoiceService).inSingletonScope();
container.bind<InvoiceController>("InvoiceController").to(InvoiceController).inSingletonScope();

export { container, dbConnection };
