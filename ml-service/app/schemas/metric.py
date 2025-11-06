from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class MetricData(BaseModel):
    id: str
    service: str
    trace_id: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    timestamp: datetime
    response_time_ms: float
    status_code: int
    request_count: int
    error_count: int
    response_size_bytes: Optional[int] = None
    created_at: datetime

class AnomalyAlert(BaseModel):
    alert_id: str
    timestamp: datetime
    service: str
    trace_id: Optional[str] = None
    method: Optional[str] = None
    path: Optional[str] = None
    metric_id: str
    anomaly_score: float
    anomaly_type: str
    details: dict
    threshold: float
