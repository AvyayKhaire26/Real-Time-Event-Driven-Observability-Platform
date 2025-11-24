import os

EVENT_API_BASE = os.getenv('EVENT_API_BASE', 'http://localhost:3006/api/events')
METRIC_API_BASE = os.getenv('METRIC_API_BASE', 'http://localhost:3006/api/metrics')
ANOMALY_SCORE_THRESHOLD = float(os.getenv('ANOMALY_SCORE_THRESHOLD', '3.0'))
REQUEST_TIMEOUT = int(os.getenv('REQUEST_TIMEOUT', '5'))
RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
