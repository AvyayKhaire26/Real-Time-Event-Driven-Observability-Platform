import { Router, Request, Response } from "express";
import { ServiceRegistry, GatewayHealth } from "../types/service.types";
import { healthChecker } from "../utils/healthChecker";
import serviceRegistry from "../config/services.json";

const router = Router();

// Gateway health endpoint
router.get("/", async (req: Request, res: Response) => {
  try {
    const registry: ServiceRegistry = serviceRegistry;
    const serviceHealthChecks = await healthChecker.checkAllServices(registry.services);
    
    const unhealthyCount = serviceHealthChecks.filter(s => s.status === "unhealthy").length;
    const degradedCount = serviceHealthChecks.filter(s => s.status === "degraded").length;
    
    let gatewayStatus: "healthy" | "degraded" | "unhealthy" = "healthy";
    if (unhealthyCount > 0) {
      gatewayStatus = unhealthyCount >= registry.services.length / 2 ? "unhealthy" : "degraded";
    } else if (degradedCount > 0) {
      gatewayStatus = "degraded";
    }

    const health: GatewayHealth = {
      gateway: "api-gateway",
      status: gatewayStatus,
      uptime: process.uptime(),
      services: serviceHealthChecks,
      timestamp: new Date()
    };

    const statusCode = gatewayStatus === "healthy" ? 200 : gatewayStatus === "degraded" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(500).json({
      gateway: "api-gateway",
      status: "unhealthy",
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Individual service health
router.get("/:serviceName", async (req: Request, res: Response) => {
  try {
    const { serviceName } = req.params;
    const registry: ServiceRegistry = serviceRegistry;
    const service = registry.services.find(s => s.name === serviceName);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: `Service ${serviceName} not found in registry`
      });
    }

    const health = await healthChecker.checkService(service);
    const statusCode = health.status === "healthy" ? 200 : 503;
    
    res.status(statusCode).json(health);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;