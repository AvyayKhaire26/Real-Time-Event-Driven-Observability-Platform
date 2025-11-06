import logging
from typing import List, Dict, Any
from datetime import datetime
from app.models.anomaly_detector import detector
from app.models.statistical_detector import statistical_detector
from app.services.database import db
from app.services.rabbitmq import rabbitmq_publisher
from app.config.settings import settings

logger = logging.getLogger(__name__)

class MLService:
    def __init__(self):
        self.last_check = {}
        self.detection_mode = {}  # Track detection mode per service
    
    def initialize(self):
        """Load saved models at startup"""
        logger.info("Initializing ML service...")
        detector.load_saved_models()
        
        # Set initial detection modes
        for service in detector.get_trained_services():
            self.detection_mode[service] = "ml"
            logger.info(f"✅ {service}: ML mode (model loaded)")
    
    def train_all_services(self) -> Dict[str, Any]:
        """Train models for all services with intelligent backfill"""
        logger.info("Starting training for all services...")
        
        services = db.get_all_services()
        
        if not services:
            logger.warning("No services found in database")
            return {
                "success": False,
                "message": "No services found",
                "services_trained": [],
                "total_samples": 0
            }
        
        trained_services = []
        total_samples = 0
        backfill_used = []
        
        for service in services:
            # Try recent window first (60 minutes)
            metrics = db.fetch_metrics_by_service(
                service, 
                minutes=settings.TRAINING_WINDOW_MINUTES
            )
            
            # Backfill: If not enough samples, try wider windows
            if len(metrics) < settings.MIN_SAMPLES:
                logger.info(f"{service}: Only {len(metrics)} samples in 60min, trying 6-hour backfill...")
                metrics = db.fetch_metrics_by_service(service, minutes=360)
                
                if len(metrics) < settings.MIN_SAMPLES:
                    logger.info(f"{service}: Only {len(metrics)} samples in 6h, trying 24-hour backfill...")
                    metrics = db.fetch_metrics_by_service(service, minutes=1440)
                    
                    if len(metrics) < settings.MIN_SAMPLES:
                        logger.info(f"Skipping {service}: only {len(metrics)} samples (need {settings.MIN_SAMPLES})")
                        
                        # Enable statistical fallback for this service
                        if service not in detector.get_trained_services():
                            self.detection_mode[service] = "statistical"
                            logger.info(f"🔄 {service}: Using statistical fallback")
                        
                        continue
                    else:
                        backfill_used.append(f"{service} (24h)")
                else:
                    backfill_used.append(f"{service} (6h)")
            
            # Train model
            success = detector.train(service, metrics, save_model=True)
            
            if success:
                trained_services.append(service)
                total_samples += len(metrics)
                self.detection_mode[service] = "ml"
                logger.info(f"✅ Trained model for {service} with {len(metrics)} samples")
        
        result = {
            "success": len(trained_services) > 0,
            "message": f"Trained {len(trained_services)} services",
            "services_trained": trained_services,
            "backfill_used": backfill_used,
            "total_samples": total_samples,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"Training complete: {result}")
        return result
    
    def detect_anomalies(self, service: str = None) -> List[Dict[str, Any]]:
        """Hybrid anomaly detection with ML + statistical fallback"""
        all_anomalies = []
        
        if service:
            services_to_check = [service]
        else:
            # Check all services (both ML and statistical)
            ml_services = detector.get_trained_services()
            all_services = db.get_all_services()
            services_to_check = list(set(ml_services + all_services))
        
        for svc in services_to_check:
            # Fetch recent metrics (last 5 minutes for real-time detection)
            metrics = db.fetch_metrics_by_service(svc, minutes=5)
            
            if not metrics:
                continue
            
            # Determine detection method
            detection_mode = self.detection_mode.get(svc, "statistical")
            anomalies = []
            
            if detection_mode == "ml" and detector.is_trained(svc):
                # Use ML model
                anomalies = detector.predict(svc, metrics)
                logger.debug(f"{svc}: ML detection checked {len(metrics)} metrics")
            
            else:
                # Use statistical fallback
                anomalies = statistical_detector.detect(metrics)
                logger.debug(f"{svc}: Statistical detection checked {len(metrics)} metrics")
            
            # Filter by threshold and publish alerts
            for anomaly in anomalies:
                anomaly['threshold'] = settings.ANOMALY_THRESHOLD
                
                # Only alert if score > threshold
                if anomaly['anomaly_score'] >= settings.ANOMALY_THRESHOLD:
                    # Publish to RabbitMQ
                    if rabbitmq_publisher.is_connected():
                        rabbitmq_publisher.publish_anomaly_alert(anomaly)
                    
                    all_anomalies.append(anomaly)
        
        if all_anomalies:
            logger.info(f"🚨 Detected {len(all_anomalies)} anomalies across {len(services_to_check)} services")
        
        return all_anomalies
    
    def get_service_status(self) -> Dict[str, Any]:
        """Get detailed status of all services and their detection modes"""
        ml_services = detector.get_trained_services()
        db_services = db.get_all_services()
        
        # Combine: services with models OR services in DB
        all_services = list(set(ml_services + db_services))
        
        status = {
            "total_services": len(all_services),
            "ml_enabled": len(ml_services),
            "statistical_fallback": len(all_services) - len(ml_services),
            "services": []
        }
        
        for service in all_services:
            mode = self.detection_mode.get(service, "none")
            if service in ml_services and mode == "none":
                mode = "ml"  # Fix: loaded models should be "ml" mode
            
            info = {
                "name": service,
                "detection_mode": mode,
                "model_trained": service in ml_services
            }
            
            if service in ml_services:
                info["last_training"] = detector.last_training.get(service)
                info["model_version"] = detector.model_versions.get(service)
            
            status['services'].append(info)
        
        return status

# Singleton instance
ml_service = MLService()

