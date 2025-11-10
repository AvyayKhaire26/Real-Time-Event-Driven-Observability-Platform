from pydantic import BaseModel, ConfigDict
from typing import Any, Optional, List, Dict

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: str
    is_model_trained: bool
    last_training: Optional[str] = None

    model_config = ConfigDict(protected_namespaces=())

class AnomalyDetail(BaseModel):
    metric_id: str
    service: str
    trace_id: str
    method: str
    path: str
    anomaly_score: float
    detection_method: str
    model_version: str
    timestamp: str
    details: Dict[str, Any]
    threshold: float
    # ==== ENRICHED FIELDS (optional) ====
    root_cause: Optional[Dict[str, Any]] = None
    service_chain: Optional[List[str]] = None
    impacted_services: Optional[List[str]] = None
    suggested_action: Optional[str] = None

class AnomalyDetectionResponse(BaseModel):
    success: bool
    service: str
    anomalies_detected: int
    timestamp: str
    details: List[AnomalyDetail]

class TrainingResponse(BaseModel):
    success: bool
    message: str
    services_trained: List[str]
    total_samples: int
    timestamp: str
