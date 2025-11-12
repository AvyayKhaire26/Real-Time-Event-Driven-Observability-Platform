import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { INotificationService } from "../services/NotificationService";
import { ILogger, TYPES } from "@observability/core";
import { v4 as uuidv4 } from "uuid";

@injectable()
export class NotificationController {
  constructor(
    @inject("NotificationService") private notificationService: INotificationService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  private getTraceId(req: Request): string {
    return (
      (req.headers["x-trace-id"] as string) ||
      (req.headers["X-Trace-Id"] as string) ||
      uuidv4()
    );
  }

  async sendNotification(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      this.logger.info("Send notification request", { traceId, body: req.body });
      const notification = await this.notificationService.sendNotification(req.body, traceId);
      res.status(201).json({
        success: true,
        data: notification,
        traceId,
        message: "Notification sent successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to send notification", traceId);
    }
  }

  async getNotificationById(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { id } = req.params;
      this.logger.info("Get notification by id", { traceId, id });
      const notification = await this.notificationService.getNotificationById(id, traceId);
      if (!notification) {
        res.status(404).json({
          success: false,
          message: "Notification not found",
          traceId
        });
        return;
      }
      res.json({
        success: true,
        data: notification,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch notification", traceId);
    }
  }

  async getNotificationsByRecipient(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      const { recipient } = req.params;
      this.logger.info("Get notifications by recipient", { traceId, recipient });
      const notifications = await this.notificationService.getNotificationsByRecipient(recipient, traceId);
      res.json({
        success: true,
        data: notifications,
        count: notifications.length,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch notifications", traceId);
    }
  }

  async getAllNotifications(req: Request, res: Response): Promise<void> {
    const traceId = this.getTraceId(req);
    try {
      this.logger.info("Get all notifications", { traceId });
      const notifications = await this.notificationService.getAllNotifications(traceId);
      res.json({
        success: true,
        data: notifications,
        count: notifications.length,
        traceId
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch notifications", traceId);
    }
  }

  private handleError(res: Response, error: Error, message: string, traceId: string): void {
    this.logger.error(message, error, { traceId, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message,
      error: error.message,
      traceId
    });
  }
}
