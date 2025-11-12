import { injectable, inject } from "inversify";
import { INotificationRepository } from "../repositories/NotificationRepository";
import { Notification } from "../entities/Notification.entity";
import { ILogger, TYPES } from "@observability/core";
import {
  SendNotificationDto,
  NotificationStatus
} from "../utils/notification.utils";

export interface INotificationService {
  sendNotification(notificationDto: SendNotificationDto, traceId?: string): Promise<Notification>;
  getNotificationById(id: string, traceId?: string): Promise<Notification | null>;
  getNotificationsByRecipient(recipient: string, traceId?: string): Promise<Notification[]>;
  getAllNotifications(traceId?: string): Promise<Notification[]>;
}

@injectable()
export class NotificationService implements INotificationService {
  constructor(
    @inject("NotificationRepository") private notificationRepo: INotificationRepository,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async sendNotification(notificationDto: SendNotificationDto, traceId?: string): Promise<Notification> {
    try {
      // Create notification record
      const notification = await this.notificationRepo.create({
        type: notificationDto.type,
        recipient: notificationDto.recipient,
        subject: notificationDto.subject,
        message: notificationDto.message,
        metadata: notificationDto.metadata,
        status: NotificationStatus.PENDING
      });
      // Simulate sending
      await this.simulateSending(notification, traceId);
      // Update status to SENT
      const updatedNotification = await this.notificationRepo.updateStatus(
        notification.id,
        NotificationStatus.SENT,
        new Date()
      );
      this.logger.info("Notification sent", { traceId, notificationId: notification.id, type: notification.type, recipient: notification.recipient });
      return updatedNotification!;
    } catch (error) {
      this.logger.error("Failed to send notification", error as Error, { traceId, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async getNotificationById(id: string, traceId?: string): Promise<Notification | null> {
    this.logger.info("Get notification by id", { traceId, id });
    return await this.notificationRepo.findById(id);
  }

  async getNotificationsByRecipient(recipient: string, traceId?: string): Promise<Notification[]> {
    this.logger.info("Get notifications by recipient", { traceId, recipient });
    return await this.notificationRepo.findByRecipient(recipient);
  }

  async getAllNotifications(traceId?: string): Promise<Notification[]> {
    this.logger.info("Get all notifications", { traceId });
    return await this.notificationRepo.findAll();
  }

  private async simulateSending(notification: Notification, traceId?: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    this.logger.info("Simulate sending notification", { traceId, notificationId: notification.id });
    this.logger.info(`📧 [${notification.type}] Sending to: ${notification.recipient}`, { traceId });
    if (notification.subject) {
      this.logger.info(`Subject: ${notification.subject}`, { traceId });
    }
    this.logger.info(`Message: ${notification.message}`, { traceId });
  }
}
