import pika
import json
import logging
from typing import Dict, Any
from app.config.settings import settings

logger = logging.getLogger(__name__)

class RabbitMQPublisher:
    def __init__(self):
        self.connection = None
        self.channel = None
        self.exchange = settings.RABBITMQ_EXCHANGE
    
    def connect(self):
        """Connect to RabbitMQ"""
        try:
            parameters = pika.URLParameters(settings.RABBITMQ_URL)
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            
            self.channel.exchange_declare(
                exchange=self.exchange,
                exchange_type='topic',
                durable=True
            )
            
            logger.info(f"Connected to RabbitMQ: {self.exchange}")
            
        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            raise
    
    def disconnect(self):
        """Close RabbitMQ connection safely"""
        try:
            if self.connection and not self.connection.is_closed:
                self.connection.close()
            logger.info("Disconnected from RabbitMQ")
        except:
            # Silently ignore errors during shutdown
            pass
    
    def publish_anomaly_alert(self, alert: Dict[str, Any]):
        """Publish anomaly alert to RabbitMQ"""
        try:
            routing_key = f"anomaly.{alert['service']}"
            
            message = {
                "eventType": "anomaly.detected",
                "timestamp": alert['timestamp'],
                "traceId": alert.get('trace_id'),
                "service": alert['service'],
                "method": alert.get('method'),
                "path": alert.get('path'),
                "metricId": alert['metric_id'],
                "anomalyScore": alert['anomaly_score'],
                "detectionMethod": alert.get('detection_method', 'isolation_forest'),
                "threshold": alert.get('threshold', 0.65),
                "details": alert['details']
            }
            
            self.channel.basic_publish(
                exchange=self.exchange,
                routing_key=routing_key,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,
                    content_type='application/json'
                )
            )
            
            logger.debug(f"Published anomaly alert for {alert['service']}: traceId={alert.get('trace_id')}")
            
        except Exception as e:
            logger.error(f"Failed to publish anomaly alert: {e}")
    
    def is_connected(self) -> bool:
        """Check if connected to RabbitMQ"""
        try:
            return self.connection and not self.connection.is_closed
        except:
            return False

# Singleton instance
rabbitmq_publisher = RabbitMQPublisher()
