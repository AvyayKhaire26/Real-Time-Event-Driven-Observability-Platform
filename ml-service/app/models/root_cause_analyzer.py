import logging
from typing import List, Dict, Any, Optional
from app.services.database import db

logger = logging.getLogger(__name__)

class RootCauseAnalyzer:
    @staticmethod
    def fetch_trace_events(trace_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all metrics/events with the same trace_id for correlation.
        """
        try:
            # Replace this with correct DB call or API call
            return db.fetch_events_by_trace_id(trace_id)
        except Exception as exc:
            logger.error(f"Failed to fetch events for trace_id={trace_id}: {exc}")
            return []

    @staticmethod
    def analyze(events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze events in a trace chain to find likely root cause and impact.
        """
        if not events:
            return {}

        # Sort by timestamp
        events_sorted = sorted(events, key=lambda e: e.get('timestamp', ''))

        root_cause = None
        impacted_services = []
        service_chain = [e.get('service') for e in events_sorted]

        for event in events_sorted:
            details = event.get('details', {})
            # Heuristic: first service with error or high response time is likely root cause
            if (details.get('error_count', 0) > 0 or
                details.get('status_code', 500) >= 400 or
                details.get('response_time_ms', 0) > 500):
                root_cause = {
                    "service": event.get('service'),
                    "method": event.get('method'),
                    "path": event.get('path'),
                    "timestamp": event.get('timestamp'),
                    "error_details": details
                }
                break  # first anomaly is root

        # Impacted: all downstream services after root cause
        if root_cause:
            root_idx = next((i for i, e in enumerate(events_sorted)
                             if e.get('service') == root_cause['service'] and
                                e.get('timestamp') == root_cause['timestamp']), -1)
            if root_idx != -1:
                impacted_services = [e.get('service') for e in events_sorted[root_idx+1:]]

        return {
            "root_cause": root_cause,
            "service_chain": service_chain,
            "impacted_services": impacted_services,
            "suggested_action": RootCauseAnalyzer.suggest_actions(root_cause)
        }

    @staticmethod
    def suggest_actions(root_cause: Optional[Dict[str, Any]]) -> Optional[str]:
        """
        Very simple rule-based action suggestion
        """
        if not root_cause:
            return None
        error = root_cause.get("error_details", {})
        if error.get("error_count", 0) > 0:
            return f"Check errors in {root_cause['service']}, restart if recurring."
        if error.get("status_code", 0) >= 500:
            return f"Check backend or service dependencies for {root_cause['service']}."
        if error.get("status_code", 0) == 400:
            return "Check request payload or upstream data."
        if error.get("response_time_ms", 0) > 1000:
            return f"High latency in {root_cause['service']}; check resource utilization."
        return "Investigate further."

