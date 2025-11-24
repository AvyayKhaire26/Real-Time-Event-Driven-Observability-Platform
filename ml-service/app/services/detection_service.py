# app/services/detection_service.py

from typing import List, Dict, Any, Optional
from datetime import datetime

from app.utils.logger import get_logger
from app.models.anomaly_detector import detect_from_cache
from app.models.rca import basic_root_cause

logger = get_logger("detection-service")


class DetectionService:
    def __init__(self, event_cache, max_results: int = 10000):
        self.event_cache = event_cache
        self.max_results = max_results
        self.detections: List[Dict[str, Any]] = []
        self._seen_keys: set[tuple] = set()

    def _make_key(self, detection: Dict[str, Any]) -> tuple:
        """
        Fingerprint for deduping: (trace_id, service, path, method, status_code).
        This is service-agnostic and works for all business services.
        """
        return (
            detection.get("trace_id"),
            detection.get("service"),
            detection.get("path"),
            detection.get("method"),
            (detection.get("metrics") or {}).get("status_code"),
        )

    def handle_event(self, event: Dict[str, Any]) -> None:
        # Only metrics.service events trigger anomaly detection
        if event.get("eventType") != "metric.service":
            return

        service = event.get("service")
        trace_id = event.get("traceId")
        logger.info(f"Triggering detection for service={service}, trace_id={trace_id}")

        metrics = event.get("metrics") or {}
        status = metrics.get("status_code")
        error_count = metrics.get("error_count", 0)

        # 1) Unsupervised latency anomalies via z-score
        anomalies = detect_from_cache(self.event_cache, service=service)

        # 2) Hard rule: any 5xx/error_count>0 is an anomaly
        rule_based_anomaly: Optional[Dict[str, Any]] = None
        if status is not None and status >= 500:
            rule_based_anomaly = {
                "metric_id": None,
                "trace_id": trace_id,
                "service": service,
                "path": event.get("path"),
                "method": event.get("method"),
                "timestamp": event.get("timestamp"),
                "anomaly_score": 1.0,
                "signals": [
                    {
                        "feature": "status_code",
                        "value": status,
                        "z_score": None,
                        "mean": None,
                        "std": None,
                    },
                    {
                        "feature": "error_count",
                        "value": error_count,
                        "z_score": None,
                        "mean": None,
                        "std": None,
                    },
                ],
                "metrics": {
                    "response_time_ms": metrics.get("response_time_ms"),
                    "status_code": status,
                    "error_count": error_count,
                },
            }

        relevant: List[Dict[str, Any]] = [
            a
            for a in anomalies
            if trace_id
            and (a.get("trace_id") == trace_id or a.get("traceId") == trace_id)
        ]
        if not relevant:
            relevant = anomalies

        if rule_based_anomaly is not None:
            if not any(
                trace_id
                and (a.get("trace_id") == trace_id or a.get("traceId") == trace_id)
                for a in relevant
            ):
                relevant.append(rule_based_anomaly)

        if not relevant:
            return

        for anomaly in relevant:
            t_id = anomaly.get("trace_id") or anomaly.get("traceId") or trace_id

            cached_events = self.event_cache.get_by_trace_id(t_id) if t_id else []
            root_cause = basic_root_cause(t_id, cached_events=cached_events) if t_id else None

            enriched = {
                **anomaly,
                "trace_id": t_id,
                "detection_method": "rule+zscore",
                "model_version": "v1.0-hybrid",
                "timestamp_detection": datetime.utcnow().isoformat() + "Z",
                "root_cause": root_cause,
                "summary": None,
                "suggested_action": None,
            }

            self._store_detection(enriched, service)

            logger.info(
                f"Anomaly detected for service={service}, trace_id={t_id}"
            )

    def _store_detection(self, detection: Dict[str, Any], service: Optional[str]) -> None:
        key = self._make_key(detection)
        if key in self._seen_keys:
            # already stored; skip duplicate
            return
        self._seen_keys.add(key)

        self.detections.append(detection)
        if len(self.detections) > self.max_results:
            self.detections = self.detections[-self.max_results :]

    def get_recent(self, service: Optional[str] = None) -> List[Dict[str, Any]]:
        if service:
            return [d for d in self.detections if d.get("service") == service]
        return list(self.detections)
