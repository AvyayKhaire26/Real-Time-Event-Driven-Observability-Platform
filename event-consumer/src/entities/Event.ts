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
  method!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  path!: string | null;

  @Column({ type: "int", nullable: true })
  @Index()
  statusCode!: number | null;

  @Column({ type: "int", nullable: true })
  duration!: number | null;

  @Column({ type: "int", nullable: true })
  responseSize!: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  clientIp!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent!: string | null;

  @Column({ type: "jsonb", nullable: true })
  requestBody!: object | null;

  @Column({ type: "jsonb", nullable: true })
  responseBody!: object | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  errorMessage!: string | null;

  @Column({ type: "jsonb", nullable: true })
  errorDetails!: object | null;

  @CreateDateColumn()
  createdAt!: Date;
}