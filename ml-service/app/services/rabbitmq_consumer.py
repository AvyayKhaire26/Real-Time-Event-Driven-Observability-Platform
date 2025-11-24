import pika
import json
import threading
from app.utils.logger import get_logger
from app.config import RABBITMQ_URL

logger = get_logger('rabbitmq_consumer')

class RabbitMQConsumer:
    def __init__(self, event_cache, detection_service=None):
        self.rabbitmq_url = RABBITMQ_URL
        self.event_cache = event_cache
        self.detection_service = detection_service
        self.connection = None
        self.channel = None
        self.queues = ['ml-logs-queue', 'ml-metrics-queue']
        
    def connect(self):
        try:
            self.connection = pika.BlockingConnection(pika.URLParameters(self.rabbitmq_url))
            self.channel = self.connection.channel()
            logger.info('Connected to RabbitMQ')
            return True
        except Exception as e:
            logger.error(f'Failed to connect to RabbitMQ: {e}')
            return False
    
    def on_message(self, ch, method, properties, body):
        try:
            event = json.loads(body.decode('utf-8'))
            event_type = event.get('eventType', 'unknown')
            routing_key = method.routing_key
            logger.info(f'Received event: {event_type} from {routing_key}')
            
            # 1) Store in cache
            self.event_cache.add_event(event)

            # 2) Trigger automatic detection + RCA
            if self.detection_service is not None:
                self.detection_service.handle_event(event)
            
            # 3) Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            logger.error(f'Error processing message: {e}')
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    
    def start_consuming(self):
        if not self.connect():
            logger.error('Cannot start consuming - connection failed')
            return
        
        try:
            for queue in self.queues:
                self.channel.basic_qos(prefetch_count=10)
                self.channel.basic_consume(
                    queue=queue,
                    on_message_callback=self.on_message,
                    auto_ack=False
                )
                logger.info(f'Started consuming from {queue}')
            
            logger.info('RabbitMQ consumer started, waiting for messages...')
            self.channel.start_consuming()
        except KeyboardInterrupt:
            self.stop()
        except Exception as e:
            logger.error(f'Error in consumer: {e}')
            self.stop()
    
    def stop(self):
        if self.channel:
            self.channel.stop_consuming()
        if self.connection:
            self.connection.close()
        logger.info('RabbitMQ consumer stopped')
    
    def start_in_background(self):
        consumer_thread = threading.Thread(target=self.start_consuming, daemon=True)
        consumer_thread.start()
        logger.info('RabbitMQ consumer started in background thread')
