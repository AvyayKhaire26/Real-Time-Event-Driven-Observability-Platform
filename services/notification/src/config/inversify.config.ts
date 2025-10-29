import { Container } from "inversify";
import "reflect-metadata";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { ConsoleLogger, BaseHealthCheck, DatabaseConnection, IDatabaseConnection } from "@observability/common";
import { DataSourceOptions } from "typeorm";
import { Notification } from "../entities/Notification.entity";
import { INotificationRepository, NotificationRepository } from "../repositories/NotificationRepository";
import { INotificationService, NotificationService } from "../services/NotificationService";
import { NotificationController } from "../controllers/NotificationController";

const container = new Container();

// Infrastructure
const logger = new ConsoleLogger("notification-service");
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);
container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck("notification-service"));

// Database Configuration
const dbOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "observability_db",
  entities: [Notification],
  synchronize: true,
  logging: false
};

const dbConnection = new DatabaseConnection(logger, dbOptions);
container.bind<IDatabaseConnection>("DatabaseConnection").toConstantValue(dbConnection);

// Repository
container.bind<INotificationRepository>("NotificationRepository").toDynamicValue((context) => {
  const db = context.container.get<IDatabaseConnection>("DatabaseConnection");
  return new NotificationRepository(db);
}).inSingletonScope();

// Service
container.bind<INotificationService>("NotificationService").to(NotificationService).inSingletonScope();

// Controller
container.bind<NotificationController>("NotificationController").to(NotificationController).inSingletonScope();

export { container, dbConnection };