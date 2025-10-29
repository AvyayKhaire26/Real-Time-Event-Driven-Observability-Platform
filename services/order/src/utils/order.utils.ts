export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED"
}

export interface OrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface CreateOrderDto {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

export class OrderValidationUtils {
  static validateOrderItems(items: any[]): void {
    if (!items || items.length === 0) {
      throw new OrderValidationError("Order must contain at least one item");
    }

    for (const item of items) {
      if (!item.productId || typeof item.productId !== "string") {
        throw new OrderValidationError("Invalid productId in order item");
      }
      if (!item.quantity || item.quantity <= 0) {
        throw new OrderValidationError("Quantity must be greater than 0");
      }
    }
  }

  static validateUserId(userId: string): void {
    if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
      throw new OrderValidationError("Valid userId is required");
    }
  }

  static calculateOrderTotal(items: OrderItemDto[]): number {
    return items.reduce((total, item) => total + item.amount, 0);
  }
}