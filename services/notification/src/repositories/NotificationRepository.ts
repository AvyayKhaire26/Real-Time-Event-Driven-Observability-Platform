import { injectable } from "inversify";
import { Repository } from "typeorm";
import { Notification } from "../entities/Notification.entity";
import { IDatabaseConnection } from "@observability/common";
import { NotificationStatus } from "../utils/notification.utils";

export interface INotificationRepository {
  findAll(): Promise<Notification[]>;
  findById(id: string): Promise<Notification | null>;
  findByRecipient(recipient: string): Promise<Notification[]>;
  create(notificationData: Partial<Notification>): Promise<Notification>;
  updateStatus(id: string, status: NotificationStatus, sentAt?: Date): Promise<Notification | null>;
}

@injectable()
export class NotificationRepository implements INotificationRepository {
  private dbConnection: IDatabaseConnection;

  constructor(dbConnection: IDatabaseConnection) {
    this.dbConnection = dbConnection;
  }

  private getRepository(): Repository<Notification> {
    return this.dbConnection.getDataSource().getRepository(Notification);
  }

  async findAll(): Promise<Notification[]> {
    return await this.getRepository().find({ order: { createdAt: "DESC" } });
  }

  async findById(id: string): Promise<Notification | null> {
    return await this.getRepository().findOne({ where: { id } });
  }

  async findByRecipient(recipient: string): Promise<Notification[]> {
    return await this.getRepository().find({ 
      where: { recipient },
      order: { createdAt: "DESC" }
    });
  }

  async create(notificationData: Partial<Notification>): Promise<Notification> {
    const repo = this.getRepository();
    const notification = repo.create(notificationData);
    return await repo.save(notification);
  }

  async updateStatus(id: string, status: NotificationStatus, sentAt?: Date): Promise<Notification | null> {
    await this.getRepository().update(id, { status, sentAt });
    return await this.findById(id);
  }
}