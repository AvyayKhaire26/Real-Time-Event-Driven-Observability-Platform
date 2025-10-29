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
  createOrder(orderDto: CreateOrderDto): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  getUserOrders(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null>;
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

  async createOrder(orderDto: CreateOrderDto): Promise<Order> {
    try {
      this.validateOrderRequest(orderDto);
      
      const orderItems = await this.fetchProductDetails(orderDto.items);
      const totalAmount = OrderValidationUtils.calculateOrderTotal(orderItems);

      const order = await this.orderRepo.create({
        userId: orderDto.userId,
        items: orderItems,
        totalAmount,
        status: OrderStatus.PENDING
      });

      this.logger.info(`Order created successfully: ${order.id}`, { userId: orderDto.userId });
      return order;
    } catch (error) {
      this.logger.error("Error creating order", error as Error);
      throw error;
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    return await this.orderRepo.findById(id);
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return await this.orderRepo.findByUserId(userId);
  }

  async getAllOrders(): Promise<Order[]> {
    return await this.orderRepo.findAll();
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
    this.logger.info(`Updating order ${id} status to ${status}`);
    return await this.orderRepo.updateStatus(id, status);
  }

  private validateOrderRequest(orderDto: CreateOrderDto): void {
    OrderValidationUtils.validateUserId(orderDto.userId);
    OrderValidationUtils.validateOrderItems(orderDto.items);
  }

  private async fetchProductDetails(items: Array<{ productId: string; quantity: number }>): Promise<OrderItemDto[]> {
    const orderItems: OrderItemDto[] = [];

    for (const item of items) {
      const product = await this.getProductFromService(item.productId);
      
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.stock < item.quantity) {
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

  private async getProductFromService(productId: string): Promise<any> {
    try {
      const response = await axios.get(`${this.productServiceUrl}/api/products/${productId}`);
      return response.data.data;
    } catch (error) {
      this.logger.error(`Failed to fetch product ${productId}`, error as Error);
      throw new Error(`Product service unavailable`);
    }
  }
}