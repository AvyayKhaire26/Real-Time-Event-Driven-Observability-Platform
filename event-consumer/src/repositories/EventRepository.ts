import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Event } from "../entities/Event";

export class EventRepository {
  private repository: Repository<Event>;

  constructor() {
    this.repository = AppDataSource.getRepository(Event);
  }

  async save(eventData: any): Promise<Event> {
    const event = this.repository.create({
      eventType: eventData.eventType,
      service: eventData.service,
      traceId: eventData.traceId,
      timestamp: new Date(eventData.timestamp),
      method: eventData.method,
      // ✅ Handle both path and endpoint fields
      path: eventData.path || eventData.endpoint || null,
      statusCode: eventData.statusCode,
      duration: eventData.duration || null,
      responseSize: eventData.responseSize || null,
      clientIp: eventData.clientIp || null,
      userAgent: eventData.userAgent || null,
      requestBody: eventData.requestBody || null,
      responseBody: eventData.responseBody || null,
      errorMessage: eventData.errorMessage || null,
      errorDetails: eventData.errorDetails || null
    });

    return await this.repository.save(event);
  }

  async findRecent(limit: number = 100): Promise<Event[]> {
    return await this.repository.find({
      order: { timestamp: "DESC" },
      take: limit
    });
  }

  async findByService(service: string, limit: number = 100): Promise<Event[]> {
    return await this.repository.find({
      where: { service },
      order: { timestamp: "DESC" },
      take: limit
    });
  }

  async findByTraceId(traceId: string): Promise<Event[]> {
    return await this.repository.find({
      where: { traceId },
      order: { timestamp: "ASC" }
    });
  }

  async findErrors(limit: number = 100): Promise<Event[]> {
    return await this.repository
      .createQueryBuilder("event")
      .where("event.statusCode >= :code", { code: 400 })
      .orderBy("event.timestamp", "DESC")
      .take(limit)
      .getMany();
  }
}