import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { InvoiceStatus } from "../utils/invoice.utils";

@Entity("invoices")
export class Invoice {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100, unique: true })
  invoiceNumber: string;

  @Column({ type: "uuid" })
  orderId: string;

  @Column({ type: "uuid" })
  paymentId: string;

  @Column({ type: "text" })
  invoiceContent: string;

  @Column({ 
    type: "enum", 
    enum: InvoiceStatus, 
    default: InvoiceStatus.PENDING 
  })
  status: InvoiceStatus;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  totalAmount: number;

  @Column({ type: "jsonb" })
  customerDetails: {
    name: string;
    email: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}