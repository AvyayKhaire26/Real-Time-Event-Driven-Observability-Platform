from pydantic import BaseModel, ConfigDict
from typing import Any, Optional

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: str
    is_model_trained: bool  # ✅ Renamed from model_trained
    last_training: Optional[str] = None
    
    model_config = ConfigDict(protected_namespaces=())  # ✅ Allow model_ prefix if needed

class AnomalyDetectionResponse(BaseModel):
    success: bool
    service: str
    anomalies_detected: int
    timestamp: str
    details: list

class TrainingResponse(BaseModel):
    success: bool
    message: str
    services_trained: list
    total_samples: int
    timestamp: str
