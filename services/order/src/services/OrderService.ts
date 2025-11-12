import { injectable, inject } from "inversify";
import { IOrderRepository } from "../repositories/OrderRepository";
import { Order } from "../entities/Order.entity";
import { ILogger, TYPES } from "@observability/core";
import {
  CreateOrderDto,
  OrderItemDto,
  OrderStatus,
  OrderValidationUtils
} from "../utils/order.utils";
import axios from "axios";

export interface IOrderService {
  createOrder(orderDto: CreateOrderDto, traceId?: string): Promise<Order>;
  getOrderById(id: string, traceId?: string): Promise<Order | null>;
  getUserOrders(userId: string, traceId?: string): Promise<Order[]>;
  getAllOrders(traceId?: string): Promise<Order[]>;
  updateOrderStatus(id: string, status: OrderStatus, traceId?: string): Promise<Order | null>;
}

@injectable()
export class OrderService implements IOrderService {
  private productServiceUrl: string;

  constructor(
    @inject("OrderRepository") private orderRepo: IOrderRepository,
    @inject(TYPES.Logger) private logger: ILogger
  ) {
    this.productServiceUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3001";
  }

  async createOrder(orderDto: CreateOrderDto, traceId?: string): Promise<Order> {
    try {
      this.logger.info("createOrder-request", { traceId, userId: orderDto.userId, orderDto });
      this.validateOrderRequest(orderDto);
      const orderItems = await this.fetchProductDetails(orderDto.items, traceId);
      const totalAmount = OrderValidationUtils.calculateOrderTotal(orderItems);
      const order = await this.orderRepo.create({
        userId: orderDto.userId,
        items: orderItems,
        totalAmount,
        status: OrderStatus.PENDING
      });
      this.logger.info(`Order created successfully: ${order.id}`, { traceId, userId: orderDto.userId });
      return order;
    } catch (error) {
      this.logger.error("Error creating order", error as Error, { traceId, error: (error as Error).message, stack: (error as Error).stack });
      throw error;
    }
  }

  async getOrderById(id: string, traceId?: string): Promise<Order | null> {
    this.logger.info("getOrderById-request", { traceId, id });
    return await this.orderRepo.findById(id);
  }

  async getUserOrders(userId: string, traceId?: string): Promise<Order[]> {
    this.logger.info("getUserOrders-request", { traceId, userId });
    return await this.orderRepo.findByUserId(userId);
  }

  async getAllOrders(traceId?: string): Promise<Order[]> {
    this.logger.info("getAllOrders-request", { traceId });
    return await this.orderRepo.findAll();
  }

  async updateOrderStatus(id: string, status: OrderStatus, traceId?: string): Promise<Order | null> {
    this.logger.info("updateOrderStatus-request", { traceId, id, status });
    return await this.orderRepo.updateStatus(id, status);
  }

  private validateOrderRequest(orderDto: CreateOrderDto): void {
    OrderValidationUtils.validateUserId(orderDto.userId);
    OrderValidationUtils.validateOrderItems(orderDto.items);
  }

  private async fetchProductDetails(
    items: Array<{ productId: string; quantity: number }>,
    traceId?: string
  ): Promise<OrderItemDto[]> {
    const orderItems: OrderItemDto[] = [];
    for (const item of items) {
      const product = await this.getProductFromService(item.productId, traceId);
      if (!product) {
        this.logger.error("Product not found for item", undefined, { traceId, productId: item.productId });
        throw new Error(`Product not found: ${item.productId}`);
      }
      if (product.stock < item.quantity) {
        this.logger.error("Insufficient stock for item", undefined, { traceId, productId: item.productId, stock: product.stock });
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }
      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: parseFloat(product.price),
        amount: parseFloat(product.price) * item.quantity
      });
    }
    return orderItems;
  }

  private async getProductFromService(productId: string, traceId?: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.productServiceUrl}/api/products/${productId}`,
        { headers: { "X-Trace-Id": traceId } }
      );
      this.logger.info("Fetched product from product-service", { traceId, productId });
      return response.data.data;
    } catch (error) {
      this.logger.error("Failed to fetch product from product-service", error as Error, { traceId, productId, error: (error as Error).message, stack: (error as Error).stack });
      throw new Error(`Product service unavailable`);
    }
  }
}
