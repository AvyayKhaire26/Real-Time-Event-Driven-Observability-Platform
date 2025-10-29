import { DataSource } from "typeorm";

export interface IDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDataSource(): DataSource;
  isConnected(): boolean;
}