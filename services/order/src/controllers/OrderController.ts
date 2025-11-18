import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IOrderService } from "../services/OrderService";
import { ILogger, TYPES } from "@observability/core";
import { OrderStatus } from "../utils/order.utils";
import { v4 as uuidv4 } from "uuid";
import { EventPublisher } from "@observability/common";

@injectable()
export class OrderController {
    constructor(
        @inject("OrderService") private orderService: IOrderService,
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

    async createOrder(req: Request, res: Response): Promise<void> {
        const traceId = this.getTraceId(req);
        try {
            this.logger.info("Create order request", { traceId, body: req.body });
            const order = await this.orderService.createOrder(req.body, traceId);
            res.status(201).json({
                success: true,
                data: order,
                traceId,
                message: "Order created successfully"
            });
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to create order", traceId, req.body);
        }
    }

    async getOrderById(req: Request, res: Response): Promise<void> {
        const traceId = this.getTraceId(req);
        try {
            const { id } = req.params;
            this.logger.info("Get order by id", { traceId, id });
            const order = await this.orderService.getOrderById(id, traceId);
            if (!order) {
                res.status(404).json({
                    success: false,
                    message: "Order not found",
                    traceId
                });
                return;
            }
            res.json({
                success: true,
                data: order,
                traceId
            });
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch order", traceId, { id: req.params.id });
        }
    }

    async getUserOrders(req: Request, res: Response): Promise<void> {
        const traceId = this.getTraceId(req);
        try {
            const { userId } = req.params;
            this.logger.info("Get user orders", { traceId, userId });
            const orders = await this.orderService.getUserOrders(userId, traceId);
            res.json({
                success: true,
                data: orders,
                count: orders.length,
                traceId
            });
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch user orders", traceId, { userId: req.params.userId });
        }
    }

    async getAllOrders(req: Request, res: Response): Promise<void> {
        const traceId = this.getTraceId(req);
        try {
            this.logger.info("Get all orders", { traceId });
            const orders = await this.orderService.getAllOrders(traceId);
            res.json({
                success: true,
                data: orders,
                count: orders.length,
                traceId
            });
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to fetch orders", traceId, {});
        }
    }

    async updateOrderStatus(req: Request, res: Response): Promise<void> {
        const traceId = this.getTraceId(req);
        try {
            const { id } = req.params;
            const { status } = req.body;
            this.logger.info("Update order status", { traceId, id, status });
            if (!Object.values(OrderStatus).includes(status)) {
                res.status(400).json({
                    success: false,
                    message: "Invalid order status",
                    traceId
                });
                return;
            }
            const order = await this.orderService.updateOrderStatus(id, status, traceId);
            if (!order) {
                res.status(404).json({
                    success: false,
                    message: "Order not found",
                    traceId
                });
                return;
            }
            res.json({
                success: true,
                data: order,
                traceId,
                message: "Order status updated"
            });
        } catch (error: any) {
            await this.emitErrorAndRespond(res, error, "Failed to update order status", traceId, { id: req.params.id, status: req.body.status });
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
            "order.error",
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
