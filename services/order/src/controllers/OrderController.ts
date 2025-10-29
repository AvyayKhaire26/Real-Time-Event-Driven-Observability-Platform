import { Request, Response } from "express";
import { injectable, inject } from "inversify";
import { IOrderService } from "../services/OrderService";
import { ILogger, TYPES } from "@observability/core";
import { OrderStatus } from "../utils/order.utils";

@injectable()
export class OrderController {
  constructor(
    @inject("OrderService") private orderService: IOrderService,
    @inject(TYPES.Logger) private logger: ILogger
  ) {}

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      const order = await this.orderService.createOrder(req.body);
      res.status(201).json({
        success: true,
        data: order,
        message: "Order created successfully"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to create order");
    }
  }

  async getOrderById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await this.orderService.getOrderById(id);
      
      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found"
        });
        return;
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch order");
    }
  }

  async getUserOrders(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const orders = await this.orderService.getUserOrders(userId);
      
      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch user orders");
    }
  }

  async getAllOrders(req: Request, res: Response): Promise<void> {
    try {
      const orders = await this.orderService.getAllOrders();
      res.json({
        success: true,
        data: orders,
        count: orders.length
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to fetch orders");
    }
  }

  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!Object.values(OrderStatus).includes(status)) {
        res.status(400).json({
          success: false,
          message: "Invalid order status"
        });
        return;
      }

      const order = await this.orderService.updateOrderStatus(id, status);
      
      if (!order) {
        res.status(404).json({
          success: false,
          message: "Order not found"
        });
        return;
      }

      res.json({
        success: true,
        data: order,
        message: "Order status updated"
      });
    } catch (error) {
      this.handleError(res, error as Error, "Failed to update order status");
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