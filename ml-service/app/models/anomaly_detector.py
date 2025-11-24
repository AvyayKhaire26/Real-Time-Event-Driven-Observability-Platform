import requests
import numpy as np
from typing import List, Dict, Any, Optional

from app.config import METRIC_API_BASE, REQUEST_TIMEOUT


def fetch_metrics_batch(service: str, minutes: int = 60) -> List[Dict[str, Any]]:
    url = f'{METRIC_API_BASE}/service/{service}?minutes={minutes}'
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    if response.status_code == 200 and response.json().get('success'):
        return response.json()['data']  # Returns a list of metric dicts
    return []


def detect_zscore_anomalies_batch(
    metrics: List[Dict[str, Any]],
    metric_key: str = 'responseTimeMs',
    threshold: float = 3.0
) -> List[Dict[str, Any]]:
    values = [m.get(metric_key) for m in metrics if m.get(metric_key) is not None]
    if not values:
        return []

    mean = float(np.mean(values))
    std = float(np.std(values))
    if std == 0:
        return []

    anomalies: List[Dict[str, Any]] = []
    for m in metrics:
        val = m.get(metric_key)
        if val is None:
            continue

        z = (val - mean) / std
        if abs(z) > threshold:
            anomalies.append(
                {
                    "metric_id": m.get("id"),
                    "trace_id": m.get("traceId"),
                    "service": m.get("service"),
                    "path": m.get("path"),
                    "method": m.get("method"),
                    "timestamp": m.get("timestamp"),
                    "anomaly_score": abs(float(z)),
                    "signals": [
                        {
                            "feature": metric_key,
                            "value": val,
                            "z_score": float(z),
                            "mean": mean,
                            "std": std,
                        }
                    ],
                    "metrics": {
                        "response_time_ms": m.get("responseTimeMs"),
                        "status_code": m.get("statusCode"),
                        "error_count": m.get("errorCount"),
                    },
                }
            )
    return anomalies


def _flatten_metric_event(event: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Convert a metric.service event from RabbitMQ into the flat metric dict
    expected by detect_zscore_anomalies_batch.
    """
    if event.get("eventType") != "metric.service":
        return None

    metrics = event.get("metrics") or {}
    return {
        "id": None,
        "traceId": event.get("traceId"),
        "service": event.get("service"),
        "path": event.get("path"),
        "method": event.get("method"),
        "timestamp": event.get("timestamp"),
        "responseTimeMs": metrics.get("response_time_ms"),
        "statusCode": metrics.get("status_code"),
        "errorCount": metrics.get("error_count"),
        "responseSizeBytes": metrics.get("response_size_bytes"),
    }


def metrics_from_cache(event_cache, service: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Extract normalized metric records from the in-memory event cache.
    """
    metric_events = event_cache.get_metrics()
    flat: List[Dict[str, Any]] = []

    for e in metric_events:
        if service and e.get("service") != service:
            continue
        m = _flatten_metric_event(e)
        if m is not None:
            flat.append(m)

    return flat


def detect_from_cache(
    event_cache,
    service: Optional[str] = None,
    metric_key: str = "responseTimeMs",
    threshold: float = 3.0,
) -> List[Dict[str, Any]]:
    """
    Run z-score anomaly detection on metrics derived from the real-time cache.
    """
    metrics = metrics_from_cache(event_cache, service=service)
    return detect_zscore_anomalies_batch(metrics, metric_key=metric_key, threshold=threshold)
