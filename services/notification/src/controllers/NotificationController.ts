import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { INotificationService } from "../services/NotificationService";
import { ILogger, TYPES } from "@observability/core";

@injectable()
export class NotificationController {
  constructor(
    @inject("NotificationService") private notificationService: INotificationService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const notification = await this.notificationService.sendNotification(req.body);
      res.status(201).json({
        success: true,
        data: notification,
        message: "Notification sent successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to send notification");
    }
  }

  async getNotificationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.getNotificationById(id);
      
      if (!notification) {
        res.status(404).json({
          success: false,
          message: "Notification not found"
        });
        return;
      }

      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch notification");
    }
  }

  async getNotificationsByRecipient(req: Request, res: Response): Promise<void> {
    try {
      const { recipient } = req.params;
      const notifications = await this.notificationService.getNotificationsByRecipient(recipient);
      
      res.json({
        success: true,
        data: notifications,
        count: notifications.length
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch notifications");
    }
  }

  async getAllNotifications(req: Request, res: Response): Promise<void> {
    try {
      const notifications = await this.notificationService.getAllNotifications();
      res.json({
        success: true,
        data: notifications,
        count: notifications.length
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch notifications");
    }
  }

  private handleError(res: Response, error: Error, message: string): void {
    this.logger.error(message, error);
    res.status(500).json({
      success: false,
      message,
      error: error.message
    });
  }
}