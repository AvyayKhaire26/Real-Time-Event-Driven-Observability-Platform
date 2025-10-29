import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";
import { NotificationType, NotificationStatus } from "../utils/notification.utils";

@Entity("notifications")
export class Notification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ 
    type: "enum", 
    enum: NotificationType 
  })
  type: NotificationType;

  @Column({ type: "varchar", length: 255 })
  recipient: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  subject: string;

  @Column({ type: "text" })
  message: string;

  @Column({ 
    type: "enum", 
    enum: NotificationStatus, 
    default: NotificationStatus.PENDING 
  })
  status: NotificationStatus;

  @Column({ type: "jsonb", nullable: true })
  metadata: {
    orderId?: string;
    userId?: string;
    [key: string]: any;
  };

  @Column({ type: "timestamp", nullable: true })
  sentAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}