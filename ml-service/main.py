from fastapi import FastAPI, Query
import uvicorn
import os
from contextlib import asynccontextmanager
from typing import Optional

from app.utils.logger import get_logger
from app.utils.data import to_dataframe
from app.services.event_cache import EventCache
from app.services.rabbitmq_consumer import RabbitMQConsumer
from app.services.detection_service import DetectionService

logger = get_logger("ml-service")

# In-memory cache fed by RabbitMQ
event_cache = EventCache(max_size=1000)

# Detection service that runs anomalies + RCA automatically on events
detection_service = DetectionService(event_cache=event_cache, max_results=10000)

# RabbitMQ consumer (stream -> cache -> detection)
rabbitmq_consumer = RabbitMQConsumer(
    event_cache=event_cache,
    detection_service=detection_service,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("=" * 60)
    logger.info("ML Anomaly Detection Service starting...")
    logger.info("=" * 60)
    rabbitmq_consumer.start_in_background()
    logger.info("RabbitMQ consumer initialized (with detection service)")
    yield
    # Shutdown
    rabbitmq_consumer.stop()
    logger.info("ML service shut down")


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def health():
    logger.info("Health endpoint hit")
    return {
        "status": "ml-service healthy!",
        "version": "0.4.0",
        "cache_size": event_cache.size(),
        "rabbitmq_connected": rabbitmq_consumer.connection is not None,
    }


@app.get("/anomalies")
def get_recent_anomalies(service: Optional[str] = Query(None)):
    """
    Return anomalies that were already detected automatically from the stream.
    This does NOT trigger detection; it only reads from DetectionService.
    """
    logger.info(f"Fetching recent anomalies (service={service})")
    detections = detection_service.get_recent(service=service)
    df = to_dataframe(detections)  # kept for possible future use/logging
    return {
        "success": True,
        "service": service,
        "source": "realtime_stream",
        "anomalies_detected": len(detections),
        "details": detections,
    }


@app.get("/anomalies/by-trace")
def get_anomalies_by_trace(trace_id: str = Query(...)):
    """
    Convenience endpoint to filter stored detections by trace_id.
    """
    logger.info(f"Fetching anomalies for trace_id={trace_id}")
    all_detections = detection_service.get_recent()
    filtered = [d for d in all_detections if d.get("trace_id") == trace_id]
    return {
        "success": True,
        "trace_id": trace_id,
        "anomalies_detected": len(filtered),
        "details": filtered,
    }


@app.get("/cache/status")
def cache_status():
    return {
        "success": True,
        "cache_size": event_cache.size(),
        "metrics_count": len(event_cache.get_metrics()),
        "logs_count": len(event_cache.get_logs()),
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    reload_env = os.getenv("ENVIRONMENT", "development") == "development"
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=reload_env,
    )
