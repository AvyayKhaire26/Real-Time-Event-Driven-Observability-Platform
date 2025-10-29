export interface IOrderService {
  createOrder(order: CreateOrderDto): Promise<Order>;
  getOrderById(id: string): Promise<Order | null>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<void>;
}

export interface CreateOrderDto {
  userId: string;
  items: OrderItem[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: Date;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
