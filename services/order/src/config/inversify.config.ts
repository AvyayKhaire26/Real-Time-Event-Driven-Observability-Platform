import { Container } from "inversify";
import "reflect-metadata";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { ConsoleLogger, BaseHealthCheck, DatabaseConnection, IDatabaseConnection } from "@observability/common";
import { DataSourceOptions } from "typeorm";
import { Order } from "../entities/Order.entity";
import { IOrderRepository, OrderRepository } from "../repositories/OrderRepository";
import { IOrderService, OrderService } from "../services/OrderService";
import { OrderController } from "../controllers/OrderController";

const container = new Container();

// Infrastructure
const logger = new ConsoleLogger("order-service");
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);
container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck("order-service"));

// Database Configuration
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

// Repository
container.bind<IOrderRepository>("OrderRepository").toDynamicValue((context) => {
  const db = context.container.get<IDatabaseConnection>("DatabaseConnection");
  return new OrderRepository(db);
}).inSingletonScope();

// Service
container.bind<IOrderService>("OrderService").to(OrderService).inSingletonScope();

// Controller
container.bind<OrderController>("OrderController").to(OrderController).inSingletonScope();

export { container, dbConnection };