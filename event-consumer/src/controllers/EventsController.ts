import { Request, Response } from "express";
import { EventRepository } from "../repositories/EventRepository";
import { injectable } from "inversify";

@injectable()
export class EventsController {
  private eventRepository: EventRepository;

  constructor() {
    this.eventRepository = new EventRepository();
  }

  async getRecent(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await this.eventRepository.findRecent(limit);

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch events",
        error: (error as Error).message
      });
    }
  }

  async getByService(req: Request, res: Response): Promise<void> {
    try {
      const { service } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await this.eventRepository.findByService(service, limit);

      res.json({
        success: true,
        data: events,
        count: events.length,
        service
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch events by service",
        error: (error as Error).message
      });
    }
  }

  async getByTraceId(req: Request, res: Response): Promise<void> {
    try {
      const { traceId } = req.params;
      const events = await this.eventRepository.findByTraceId(traceId);

      res.json({
        success: true,
        data: events,
        count: events.length,
        traceId
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch events by trace ID",
        error: (error as Error).message
      });
    }
  }

  async getErrors(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const events = await this.eventRepository.findErrors(limit);

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch error events",
        error: (error as Error).message
      });
    }
  }
}