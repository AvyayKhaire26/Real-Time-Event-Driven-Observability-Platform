from collections import deque
from app.utils.logger import get_logger

logger = get_logger('event_cache')

class EventCache:
    def __init__(self, max_size=1000):
        self.cache = deque(maxlen=max_size)
        self.max_size = max_size
    
    def add_event(self, event):
        self.cache.append(event)
        logger.debug(f'Event added to cache. Total: {len(self.cache)}')
    
    def get_all(self):
        return list(self.cache)
    
    def get_by_trace_id(self, trace_id):
        return [e for e in self.cache if e.get('traceId') == trace_id]
    
    def get_by_service(self, service):
        return [e for e in self.cache if e.get('service') == service]
    
    def get_recent(self, count=100):
        return list(self.cache)[-count:]
    
    def get_metrics(self):
        metrics = [e for e in self.cache if e.get('eventType', '').startswith('metric.')]
        return metrics
    
    def get_logs(self):
        logs = [e for e in self.cache if e.get('eventType', '').startswith('logs.') or e.get('eventType', '').startswith('request.')]
        return logs
    
    def size(self):
        return len(self.cache)
