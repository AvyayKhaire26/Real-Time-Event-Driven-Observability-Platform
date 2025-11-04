import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Metric } from "../entities/Metric";

export class MetricRepository {
  private repository: Repository<Metric>;

  constructor() {
    this.repository = AppDataSource.getRepository(Metric);
  }

  async save(metricData: any): Promise<Metric> {
    const metric = this.repository.create({
      service: metricData.service,
      traceId: metricData.traceId || null,  // ✅ Save traceId
      method: metricData.method || null,     // ✅ Save method
      path: metricData.path || null,         // ✅ Save path
      timestamp: new Date(metricData.timestamp),
      responseTimeMs: metricData.metrics.response_time_ms,
      statusCode: metricData.metrics.status_code,
      requestCount: metricData.metrics.request_count,
      errorCount: metricData.metrics.error_count,
      responseSizeBytes: metricData.metrics.response_size_bytes
    });

    return await this.repository.save(metric);
  }

  async getAverageResponseTime(
    service: string,
    minutes: number = 60
  ): Promise<number> {
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() - minutes);

    const result = await this.repository
      .createQueryBuilder("metric")
      .select("AVG(metric.responseTimeMs)", "avg")
      .where("metric.service = :service", { service })
      .andWhere("metric.timestamp >= :startTime", { startTime })
      .getRawOne();

    return parseFloat(result.avg) || 0;
  }

  async getErrorRate(service: string, minutes: number = 60): Promise<number> {
    const startTime = new Date();
    startTime.setMinutes(startTime.getMinutes() - minutes);

    const result = await this.repository
      .createQueryBuilder("metric")
      .select("SUM(metric.errorCount)", "errors")
      .addSelect("SUM(metric.requestCount)", "requests")
      .where("metric.service = :service", { service })
      .andWhere("metric.timestamp >= :startTime", { startTime })
      .getRawOne();

    const errors = parseInt(result.errors) || 0;
    const requests = parseInt(result.requests) || 0;

    return requests > 0 ? (errors / requests) * 100 : 0;
  }

  // ✅ NEW: Get metrics by traceId for correlation
  async findByTraceId(traceId: string): Promise<Metric[]> {
    return await this.repository.find({
      where: { traceId },
      order: { timestamp: "ASC" }
    });
  }
}