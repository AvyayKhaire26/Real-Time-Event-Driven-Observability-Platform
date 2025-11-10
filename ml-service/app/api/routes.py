from fastapi import APIRouter, HTTPException
from app.schemas.response import HealthResponse, AnomalyDetectionResponse, TrainingResponse
from app.services.ml_service import ml_service
from app.services.database import db
from app.services.rabbitmq import rabbitmq_publisher
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/", tags=["Root"])
async def root():
    return {
        "service": "ML Anomaly Detection Service",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "train": "/train",
            "detect": "/detect",
            "status": "/status"
        }
    }

@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health():
    trained_services = ml_service.detector.get_trained_services()
    rabbitmq_status = "connected" if rabbitmq_publisher.is_connected() else "disconnected"
    return {
        "status": "healthy" if rabbitmq_status == "connected" else "degraded",
        "service": "ml-anomaly-detection",
        "version": "2.0.0",
        "database": "connected" if db.connection else "disconnected",
        "rabbitmq": rabbitmq_status,
        "is_model_trained": len(trained_services) > 0,
        "last_training": ml_service.detector.last_training.get(trained_services[0]) if trained_services else None
    }

@router.post("/train", response_model=TrainingResponse, tags=["ML"])
async def train_models():
    try:
        result = ml_service.train_all_services()
        return result
    except Exception as e:
        logger.error(f"Training failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/detect", response_model=AnomalyDetectionResponse, tags=["ML"])
async def detect_anomalies(service: str = None):
    try:
        anomalies = ml_service.detect_anomalies(service)
        return {
            "success": True,
            "service": service or "all",
            "anomalies_detected": len(anomalies),
            "timestamp": datetime.now().isoformat(),
            "details": anomalies
        }
    except Exception as e:
        logger.error(f"Detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status", tags=["ML"])
async def get_status():
    try:
        status = ml_service.get_service_status()
        status["rabbitmq_connected"] = rabbitmq_publisher.is_connected()
        return status
    except Exception as e:
        logger.error(f"Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=str(e))
