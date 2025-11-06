import pika
import json
import logging
import time
from collections import deque
from typing import Dict, Any, Optional
from app.config.settings import settings

logger = logging.getLogger(__name__)

class RabbitMQPublisher:
    def __init__(self):
        self.exchange = settings.RABBITMQ_EXCHANGE
        self.parameters = pika.URLParameters(settings.RABBITMQ_URL)
        self.parameters.heartbeat = 30            # keepalive
        self.parameters.blocked_connection_timeout = 30
        self.connection: Optional[pika.BlockingConnection] = None
        self.channel: Optional[pika.adapters.blocking_connection.BlockingChannel] = None
        self._closing = False
        self._buffer = deque(maxlen=1000)         # buffer outgoing messages
        self._connected = False

    def connect(self):
        """Establish connection/channel; retry with backoff."""
        backoff = 1
        while not self._closing:
            try:
                self.connection = pika.BlockingConnection(self.parameters)
                self.channel = self.connection.channel()
                self.channel.exchange_declare(exchange=self.exchange, exchange_type="topic", durable=True)
                self._connected = True
                logger.info(f"Connected to RabbitMQ: {self.exchange}")
                # flush buffered messages
                self._flush_buffer()
                return
            except Exception as e:
                self._connected = False
                logger.error(f"RabbitMQ connect failed: {e}. Retrying in {backoff}s")
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)

    def _flush_buffer(self):
        """Publish any buffered messages after reconnect."""
        if not self._connected or not self.channel:
            return
        flushed = 0
        while self._buffer:
            routing_key, message = self._buffer.popleft()
            try:
                self._basic_publish(routing_key, message)
                flushed += 1
            except Exception as e:
                logger.error(f"Failed to flush buffered message: {e}")
                # put back and break; will retry later
                self._buffer.appendleft((routing_key, message))
                break
        if flushed:
            logger.info(f"Flushed {flushed} buffered messages")

    def _ensure_connection(self):
        """Ensure connection & channel are alive; reconnect if needed."""
        if self._closing:
            return False
        if self.connection and self.connection.is_open and self.channel and self.channel.is_open:
            return True
        self._connected = False
        self.connect()
        return self._connected

    def _basic_publish(self, routing_key: str, message: Dict[str, Any]):
        """Actual publish to exchange."""
        if not self.channel:
            raise RuntimeError("Channel not available")
        self.channel.basic_publish(
            exchange=self.exchange,
            routing_key=routing_key,
            body=json.dumps(message),
            properties=pika.BasicProperties(
                delivery_mode=2,          # persistent
                content_type="application/json"
            )
        )

    def publish_anomaly_alert(self, alert: Dict[str, Any]):
        """Public API: publish anomaly alert with reconnect & buffering."""
        routing_key = f"anomaly.{alert['service']}"
        msg = {
            "eventType": "anomaly.detected",
            "timestamp": alert["timestamp"],
            "traceId": alert.get("trace_id"),
            "service": alert["service"],
            "method": alert.get("method"),
            "path": alert.get("path"),
            "metricId": alert["metric_id"],
            "anomalyScore": alert["anomaly_score"],
            "threshold": alert.get("threshold", 0.65),
            "details": alert["details"]
        }
        try:
            if not self._ensure_connection():
                # buffer if offline
                self._buffer.append((routing_key, msg))
                logger.warning("RabbitMQ offline, buffering anomaly alert")
                return
            self._basic_publish(routing_key, msg)
        except Exception as e:
            logger.error(f"Publish failed, buffering and scheduling reconnect: {e}")
            self._buffer.append((routing_key, msg))
            self._safe_close()
            self.connect()

    def is_connected(self) -> bool:
        return self._connected

    def _safe_close(self):
        try:
            if self.channel and self.channel.is_open:
                self.channel.close()
        except Exception:
            pass
        try:
            if self.connection and self.connection.is_open:
                self.connection.close()
        except Exception:
            pass

    def disconnect(self):
        """Shutdown cleanly."""
        self._closing = True
        self._safe_close()
        self._connected = False
        logger.info("Disconnected from RabbitMQ")

# Singleton
rabbitmq_publisher = RabbitMQPublisher()
