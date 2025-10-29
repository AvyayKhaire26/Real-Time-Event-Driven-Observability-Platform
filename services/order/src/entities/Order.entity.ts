import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { OrderStatus } from "../utils/order.utils";

@Entity("orders")
export class Order {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255 })
  userId: string;

  @Column({ type: "jsonb" })
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ 
    type: "enum", 
    enum: OrderStatus, 
    default: OrderStatus.PENDING 
  })
  status: OrderStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  paymentId: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  invoiceId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}