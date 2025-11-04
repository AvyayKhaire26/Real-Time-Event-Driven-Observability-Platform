import { Request, Response } from "express";
import { MetricRepository } from "../repositories/MetricRepository";
import { injectable } from "inversify";

@injectable()
export class MetricsController {
  private metricRepository: MetricRepository;

  constructor() {
    this.metricRepository = new MetricRepository();
  }

  async getAverageResponseTime(req: Request, res: Response): Promise<void> {
    try {
      const { service } = req.params;
      const minutes = parseInt(req.query.minutes as string) || 60;
      
      const avgResponseTime = await this.metricRepository.getAverageResponseTime(
        service,
        minutes
      );

      res.json({
        success: true,
        data: {
          service,
          avgResponseTime: Math.round(avgResponseTime),
          timeWindow: `${minutes} minutes`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to calculate average response time",
        error: (error as Error).message
      });
    }
  }

  async getErrorRate(req: Request, res: Response): Promise<void> {
    try {
      const { service } = req.params;
      const minutes = parseInt(req.query.minutes as string) || 60;
      
      const errorRate = await this.metricRepository.getErrorRate(service, minutes);

      res.json({
        success: true,
        data: {
          service,
          errorRate: Math.round(errorRate * 100) / 100,
          timeWindow: `${minutes} minutes`
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to calculate error rate",
        error: (error as Error).message
      });
    }
  }
}