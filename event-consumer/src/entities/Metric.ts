import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from "typeorm";

@Entity("metrics")
export class Metric {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  @Index()
  service!: string;

  @Column({ type: "uuid", nullable: true })  // ✅ Added traceId
  @Index()
  traceId!: string;

  @Column({ type: "varchar", length: 10, nullable: true })  // ✅ Added method
  method!: string;

  @Column({ type: "varchar", length: 255, nullable: true })  // ✅ Added path
  path!: string;

  @Column({ type: "timestamp" })
  @Index()
  timestamp!: Date;

  @Column({ type: "float" })
  responseTimeMs!: number;

  @Column({ type: "int" })
  statusCode!: number;

  @Column({ type: "int" })
  requestCount!: number;

  @Column({ type: "int" })
  errorCount!: number;

  @Column({ type: "int", nullable: true })
  responseSizeBytes!: number;

  @CreateDateColumn()
  createdAt!: Date;
}