import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from "typeorm";

@Entity("events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  @Index()
  eventType!: string;

  @Column({ type: "varchar", length: 50 })
  @Index()
  service!: string;

  @Column({ type: "uuid", nullable: true })
  @Index()
  traceId!: string;

  @Column({ type: "timestamp" })
  @Index()
  timestamp!: Date;

  @Column({ type: "varchar", length: 10, nullable: true })
  method!: string;

  @Column({ type: "varchar", length: 255, nullable: true })  // ✅ NOW NULLABLE
  path!: string;

  @Column({ type: "int" })
  @Index()
  statusCode!: number;

  @Column({ type: "int", nullable: true })
  duration!: number;

  @Column({ type: "int", nullable: true })
  responseSize!: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  clientIp!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent!: string;

  @Column({ type: "jsonb", nullable: true })
  requestBody!: any;

  @Column({ type: "jsonb", nullable: true })
  responseBody!: any;

  @Column({ type: "text", nullable: true })
  errorMessage!: string;

  @Column({ type: "jsonb", nullable: true })
  errorDetails!: any;

  @CreateDateColumn()
  createdAt!: Date;
}