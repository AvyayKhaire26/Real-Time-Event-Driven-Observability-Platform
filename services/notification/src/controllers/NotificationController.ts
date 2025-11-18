import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { INotificationService } from "../services/NotificationService";
import { ILogger, TYPES } from "@observability/core";
import { v4 as uuidv4 } from "uuid";
import { EventPublisher } from "@observability/common";

@injectable()
export class NotificationController {
    constructor(
        @inject("NotificationService") private notificationService: INotificationService,
        @inject(TYPES.Logger) private logger: ILogger,
        @inject("EventPublisher") private eventPublisher: EventPublisher
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
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to send notification", traceId, req.body);
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
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch notification", traceId, { id: req.params.id });
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
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch notifications", traceId, { recipient: req.params.recipient });
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
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch notifications", traceId, {});
        }
    }

    private async emitErrorAndRespond(
        res: Response,
        error: Error,
        message: string,
        traceId: string,
        context?: any
    ): Promise<void> {
        this.logger.error(message, error, { traceId, error: error.message, stack: error.stack, ...context });

        this.eventPublisher.publishEvent(
            "notification.error",
            {
                message,
                error: error.message,
                stack: error.stack,
                context
            },
            traceId
        ).catch((publishErr) => {
            this.logger.error("Failed to publish error event", publishErr, { traceId });
        });

        res.status(500).json({
            success: false,
            message,
            error: error.message,
            traceId
        });
    }
}
