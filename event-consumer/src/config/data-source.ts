import { DataSource } from "typeorm";
import dotenv from "dotenv";
import { Event } from "../entities/Event";
import { Metric } from "../entities/Metric";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "observability_events",
  synchronize: true, // Auto-create tables in development
  logging: process.env.NODE_ENV === "development",
  entities: [Event, Metric],
  migrations: [],
  subscribers: []
});