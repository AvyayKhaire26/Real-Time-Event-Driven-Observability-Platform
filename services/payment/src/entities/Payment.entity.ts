import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { PaymentStatus, PaymentMethod } from "../utils/payment.utils";

@Entity("payments")
export class Payment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  orderId: string;

  @Column({ type: "varchar", length: 255 })
  transactionId: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column({ type: "varchar", length: 10, default: "INR" })
  currency: string;

  @Column({ 
    type: "enum", 
    enum: PaymentMethod 
  })
  method: PaymentMethod;

  @Column({ 
    type: "enum", 
    enum: PaymentStatus, 
    default: PaymentStatus.PENDING 
  })
  status: PaymentStatus;

  @Column({ type: "jsonb" })
  customerDetails: {
    name: string;
    email: string;
  };

  @Column({ type: "text", nullable: true })
  failureReason: string;

  @Column({ type: "int", default: 0 })
  processingTimeMs: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}