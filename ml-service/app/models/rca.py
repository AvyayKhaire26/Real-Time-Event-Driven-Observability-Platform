import json
import time
from typing import List, Dict, Any, Optional

import requests

from app.config import EVENT_API_BASE, REQUEST_TIMEOUT


def fetch_events_for_trace(trace_id: str) -> List[Dict[str, Any]]:
    url = f"{EVENT_API_BASE}/trace/{trace_id}"
    response = requests.get(url, timeout=REQUEST_TIMEOUT)
    if response.status_code == 200 and response.json().get("success"):
        return response.json()["data"]  # list of events
    return []


def fetch_events_with_retry(
    trace_id: str,
    max_retries: int = 2,
    backoff_ms: int = 500,
) -> List[Dict[str, Any]]:
    events: List[Dict[str, Any]] = []
    attempt = 0
    while attempt <= max_retries and not events:
        events = fetch_events_for_trace(trace_id)
        if events:
            break
        attempt += 1
        if attempt <= max_retries:
            time.sleep(backoff_ms / 1000.0)
    return events


def _safe_json_loads(value: Any) -> Optional[Dict[str, Any]]:
    """
    Best-effort JSON decode for errorDetails or similar fields that may be
    stored as dict or JSON string.
    """
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            return None
    return None


def _extract_error_info(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Centralized extraction of error-related fields from any event shape.

    Works for all services as long as they follow the general pattern of
    providing errorMessage / errorDetails / error / message somewhere.
    """
    status = event.get("statusCode")
    event_type = (event.get("eventType") or "").lower()

    # Canonical top-level fields
    error_message = event.get("errorMessage") or event.get("message")
    raw_details = event.get("errorDetails")

    # Try to decode structured details
    details_dict = _safe_json_loads(raw_details)

    # Many services put the actual root error string under errorDetails.error
    error_from_details = details_dict.get("error") if details_dict else None

    # Some services may put error at top-level
    generic_error = event.get("error")

    # Pick the best human-readable reason
    reason = (
        error_message
        or error_from_details
        or generic_error
        or event.get("reason")
        or "Unknown error"
    )

    return {
        "status": status,
        "event_type": event_type,
        "error_message": error_message,
        "details_dict": details_dict,
        "raw_details": raw_details,
        "reason": reason,
    }


def _root_priority(event: Dict[str, Any]) -> int:
    """
    Assign a priority score to error-like events (service-agnostic).

    Higher score = more likely to be the true root cause.
    """
    info = _extract_error_info(event)
    status = info["status"]
    has_error_msg = bool(info["error_message"])
    has_details = bool(info["details_dict"])
    event_type = info["event_type"]

    # Highest: HTTP error with explicit message/details (e.g. error.occurred)
    if status is not None and status >= 400 and (has_error_msg or has_details):
        return 3

    # Next: HTTP error without rich metadata (e.g. request.completed 500)
    if status is not None and status >= 400:
        return 2

    # Next: any event whose type contains "error" (e.g. order.error, payment.error)
    if "error" in event_type:
        return 1

    return 0


def _select_root(events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """
    Given a list of events, return the best root event based on priority,
    preserving temporal ordering when priorities tie.
    """
    if not events:
        return None

    events_sorted = sorted(events, key=lambda e: e.get("timestamp", ""))

    best_event: Optional[Dict[str, Any]] = None
    best_score = 0
    for e in events_sorted:
        score = _root_priority(e)
        if score > best_score:
            best_score = score
            best_event = e

    return best_event


def basic_root_cause(
    trace_id: str,
    cached_events: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Hybrid, service-agnostic RCA:

    - Look at cached events first (from RabbitMQ stream).
    - If there is no rich error in cache (priority < 3), also fetch DB events
      from event-consumer API and re-select the root across combined events.
    - Extract error info via _extract_error_info so all services share one logic.
    - Build a de-duplicated service_chain and impacted_services.
    """
    cache_events: List[Dict[str, Any]] = cached_events or []
    db_events: List[Dict[str, Any]] = []

    # First pass: try to pick a root from cache only
    root_from_cache = _select_root(cache_events)
    cache_has_rich_error = _root_priority(root_from_cache) >= 3 if root_from_cache else False

    # If cache doesn't contain a rich error, pull from DB and merge
    if not cache_has_rich_error:
        db_events = fetch_events_with_retry(trace_id)

    # Merge events (cache first, then any DB events not already present)
    combined: List[Dict[str, Any]] = list(cache_events)
    if db_events:
        seen_ids = {e.get("id") for e in combined if e.get("id")}
        for e in db_events:
            eid = e.get("id")
            if not eid or eid not in seen_ids:
                combined.append(e)

    events_sorted = sorted(combined, key=lambda e: e.get("timestamp", ""))

    # Build service_chain with de-duplicated services in order (service-agnostic)
    service_chain: List[str] = []
    seen_services = set()
    for e in events_sorted:
        s = e.get("service")
        if s and s not in seen_services:
            service_chain.append(s)
            seen_services.add(s)

    # Final root selection over combined events
    best_event = _select_root(combined)

    if best_event:
        root_service = best_event.get("service")
        info = _extract_error_info(best_event)

        # impacted_services: all distinct services in chain except root
        impacted_services = list(
            {s for s in service_chain if s is not None and s != root_service}
        )

        return {
            "service": root_service,
            "reason": info["reason"],
            "timestamp": best_event.get("timestamp"),
            "trace_id": trace_id,
            "service_chain": service_chain,
            "impacted_services": impacted_services or [root_service],
            "error_details": {
                "message": info["error_message"],
                "stack": best_event.get("stack") or best_event.get("error"),
                "raw_details": info["raw_details"],
            },
        }

    # Fallback: no clear error event found
    return {
        "service": None,
        "reason": "No error found in trace.",
        "trace_id": trace_id,
        "service_chain": service_chain,
        "impacted_services": [],
        "error_details": None,
    }
