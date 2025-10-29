import { Container } from "inversify";
import "reflect-metadata";
import { TYPES, ILogger, IHealthCheck } from "@observability/core";
import { ConsoleLogger, BaseHealthCheck, DatabaseConnection, IDatabaseConnection } from "@observability/common";
import { DataSourceOptions } from "typeorm";
import { Product } from "../entities/Product.entity";
import { IProductRepository, ProductRepository } from "../repositories/ProductRepository";
import { IProductService, ProductService } from "../services/ProductService";
import { ProductController } from "../controllers/ProductController";

const container = new Container();

// Infrastructure
const logger = new ConsoleLogger("product-service");
container.bind<ILogger>(TYPES.Logger).toConstantValue(logger);
container.bind<IHealthCheck>(TYPES.HealthCheck).toConstantValue(new BaseHealthCheck("product-service"));

// Database Configuration
const dbOptions: DataSourceOptions = {
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "observability_products",
  entities: [Product],
  synchronize: true, // Auto-create tables in dev
  logging: false
};

const dbConnection = new DatabaseConnection(logger, dbOptions);
container.bind<IDatabaseConnection>("DatabaseConnection").toConstantValue(dbConnection);

// Repository
container.bind<IProductRepository>("ProductRepository").toDynamicValue((context) => {
  const db = context.container.get<IDatabaseConnection>("DatabaseConnection");
  return new ProductRepository(db);
}).inSingletonScope();

// Service
container.bind<IProductService>("ProductService").to(ProductService).inSingletonScope();

// Controller
container.bind<ProductController>("ProductController").to(ProductController).inSingletonScope();

export { container, dbConnection };
