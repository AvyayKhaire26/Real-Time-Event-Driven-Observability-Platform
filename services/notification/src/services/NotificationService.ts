import { injectable, inject } from "inversify";
import { INotificationRepository } from "../repositories/NotificationRepository";
import { Notification } from "../entities/Notification.entity";
import { ILogger, TYPES } from "@observability/core";
import { 
  SendNotificationDto, 
  NotificationStatus 
} from "../utils/notification.utils";

export interface INotificationService {
  sendNotification(notificationDto: SendNotificationDto): Promise<Notification>;
  getNotificationById(id: string): Promise<Notification | null>;
  getNotificationsByRecipient(recipient: string): Promise<Notification[]>;
  getAllNotifications(): Promise<Notification[]>;
}

@injectable()
export class NotificationService implements INotificationService {
  constructor(
    @inject("NotificationRepository") private notificationRepo: INotificationRepository,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async sendNotification(notificationDto: SendNotificationDto): Promise<Notification> {
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

      // Simulate sending (just log it)
      await this.simulateSending(notification);

      // Update status to SENT
      const updatedNotification = await this.notificationRepo.updateStatus(
        notification.id,
        NotificationStatus.SENT,
        new Date()
      );

      this.logger.info(`Notification sent: ${notification.id}`, {
        type: notification.type,
        recipient: notification.recipient
      });

      return updatedNotification!;
    } catch (error) {
      this.logger.error("Failed to send notification", error as Error);
      throw error;
    }
  }

  async getNotificationById(id: string): Promise<Notification | null> {
    return await this.notificationRepo.findById(id);
  }

  async getNotificationsByRecipient(recipient: string): Promise<Notification[]> {
    return await this.notificationRepo.findByRecipient(recipient);
  }

  async getAllNotifications(): Promise<Notification[]> {
    return await this.notificationRepo.findAll();
  }

  private async simulateSending(notification: Notification): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Log the notification (in real app, this would call email/SMS API)
    this.logger.info(`📧 [${notification.type}] Sending to: ${notification.recipient}`);
    if (notification.subject) {
      this.logger.info(`   Subject: ${notification.subject}`);
    }
    this.logger.info(`   Message: ${notification.message}`);
  }
}