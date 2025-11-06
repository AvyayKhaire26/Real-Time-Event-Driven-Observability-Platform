import psycopg2
from psycopg2.extras import RealDictCursor
from typing import List, Dict, Any
import logging
from app.config.settings import settings

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """Connect to PostgreSQL database"""
        try:
            self.connection = psycopg2.connect(
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                database=settings.DB_NAME,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD
            )
            self.cursor = self.connection.cursor(cursor_factory=RealDictCursor)
            logger.info(f"✅ Connected to database: {settings.DB_NAME}")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        logger.info("Disconnected from database")
    
    def fetch_recent_metrics(self, minutes: int = 60) -> List[Dict[str, Any]]:
        """Fetch metrics from the last N minutes"""
        query = """
            SELECT 
                id,
                service,
                "traceId" as trace_id,
                method,
                path,
                timestamp,
                "responseTimeMs" as response_time_ms,
                "statusCode" as status_code,
                "requestCount" as request_count,
                "errorCount" as error_count,
                "responseSizeBytes" as response_size_bytes,
                "createdAt" as created_at
            FROM metrics
            WHERE timestamp >= NOW() - INTERVAL %s
            ORDER BY timestamp DESC
        """
        
        try:
            self.cursor.execute(query, (f"{minutes} minutes",))
            results = self.cursor.fetchall()
            logger.debug(f"Fetched {len(results)} metrics from last {minutes} minutes")
            return results
        except Exception as e:
            logger.error(f"Failed to fetch metrics: {e}")
            return []
    
    def fetch_metrics_by_service(self, service: str, minutes: int = 60) -> List[Dict[str, Any]]:
        """
        Fetch metrics for a specific service with support for wide time windows
        
        Args:
            service: Service name
            minutes: Time window in minutes (60, 360, 1440 for backfill)
        """
        query = """
            SELECT 
                id,
                service,
                "traceId" as trace_id,
                method,
                path,
                timestamp,
                "responseTimeMs" as response_time_ms,
                "statusCode" as status_code,
                "requestCount" as request_count,
                "errorCount" as error_count,
                "responseSizeBytes" as response_size_bytes,
                "createdAt" as created_at
            FROM metrics
            WHERE service = %s 
            AND timestamp >= NOW() - INTERVAL %s
            ORDER BY timestamp DESC
            LIMIT 1000
        """
        
        try:
            self.cursor.execute(query, (service, f"{minutes} minutes"))
            results = self.cursor.fetchall()
            
            if minutes > 60:
                logger.info(f"📊 Backfill: Fetched {len(results)} metrics for {service} from last {minutes//60}h")
            else:
                logger.debug(f"Fetched {len(results)} metrics for {service}")
            
            return results
        except Exception as e:
            logger.error(f"Failed to fetch metrics for {service}: {e}")
            return []
    
    def get_all_services(self) -> List[str]:
        """Get list of all unique services"""
        query = """
            SELECT DISTINCT service 
            FROM metrics 
            WHERE timestamp >= NOW() - INTERVAL '24 hours'
            ORDER BY service
        """
        
        try:
            self.cursor.execute(query)
            results = self.cursor.fetchall()
            services = [row['service'] for row in results if row['service'] != 'api']  # Filter out legacy "api"
            logger.debug(f"Found {len(services)} services")
            return services
        except Exception as e:
            logger.error(f"Failed to fetch services: {e}")
            return []

# Singleton instance
db = Database()
