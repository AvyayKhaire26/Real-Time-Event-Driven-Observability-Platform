import { injectable } from 'inversify';
import { DataSource, DataSourceOptions } from 'typeorm';
import { ILogger } from '@observability/core';

export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getDataSource(): DataSource;
  isConnected(): boolean;
}

@injectable()
export class DatabaseConnection implements IDatabaseConnection {
  private dataSource: DataSource;
  private logger: ILogger;
  private connected: boolean = false;

  constructor(logger: ILogger, options: DataSourceOptions) {
    this.logger = logger;
    this.dataSource = new DataSource(options);
  }

  async connect(): Promise<void> {
    try {
      if (!this.connected) {
        await this.dataSource.initialize();
        this.connected = true;
        this.logger.info('Database connection established');
      }
    } catch (error) {
      this.logger.error('Database connection failed', error as Error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.connected && this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        this.connected = false;
        this.logger.info('Database connection closed');
      }
    } catch (error) {
      this.logger.error('Database disconnection failed', error as Error);
      throw error;
    }
  }

  getDataSource(): DataSource {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    return this.dataSource;
  }

  isConnected(): boolean {
    return this.connected && this.dataSource.isInitialized;
  }
}
