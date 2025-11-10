import logging
from typing import List, Dict, Any
from datetime import datetime

from app.models.anomaly_detector import detector
from app.models.statistical_detector import statistical_detector
from app.services.database import db
from app.services.rabbitmq import rabbitmq_publisher
from app.config.settings import settings

# IMPORT ROOT CAUSE ANALYZER
from app.models.root_cause_analyzer import RootCauseAnalyzer

logger = logging.getLogger(__name__)

class MLService:
    def __init__(self):
        self.last_check = {}
        self.detection_mode = {} # Track detection mode per service

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
            metrics = db.fetch_metrics_by_service(
                service,
                minutes=settings.TRAINING_WINDOW_MINUTES
            )
            if len(metrics) < settings.MIN_SAMPLES:
                logger.info(f"{service}: Only {len(metrics)} samples in 60min, trying 6-hour backfill...")
                metrics = db.fetch_metrics_by_service(service, minutes=360)
                if len(metrics) < settings.MIN_SAMPLES:
                    logger.info(f"{service}: Only {len(metrics)} samples in 6h, trying 24-hour backfill...")
                    metrics = db.fetch_metrics_by_service(service, minutes=1440)
                    if len(metrics) < settings.MIN_SAMPLES:
                        logger.info(f"Skipping {service}: only {len(metrics)} samples (need {settings.MIN_SAMPLES})")
                        if service not in detector.get_trained_services():
                            self.detection_mode[service] = "statistical"
                            logger.info(f"✅ {service}: Using statistical fallback")
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
        """Hybrid anomaly detection with ML + statistical fallback, now with root cause enrichment"""
        all_anomalies = []
        if service:
            services_to_check = [service]
        else:
            ml_services = detector.get_trained_services()
            all_services = db.get_all_services()
            services_to_check = list(set(ml_services + all_services))

        for svc in services_to_check:
            metrics = db.fetch_metrics_by_service(svc, minutes=5)
            if not metrics:
                continue
            detection_mode = self.detection_mode.get(svc, "statistical")
            anomalies = []
            if detection_mode == "ml" and detector.is_trained(svc):
                anomalies = detector.predict(svc, metrics)
                logger.debug(f"{svc}: ML detection checked {len(metrics)} metrics")
            else:
                anomalies = statistical_detector.detect(metrics)
                logger.debug(f"{svc}: Statistical detection checked {len(metrics)} metrics")
            for anomaly in anomalies:
                anomaly['threshold'] = settings.ANOMALY_THRESHOLD

                if anomaly['anomaly_score'] >= settings.ANOMALY_THRESHOLD:
                    # ENRICH ANOMALY: fetch trace events, analyze
                    trace_id = anomaly.get("trace_id")
                    if trace_id:
                        events = RootCauseAnalyzer.fetch_trace_events(trace_id)
                        enrichment = RootCauseAnalyzer.analyze(events)
                        anomaly.update({
                            "root_cause": enrichment.get("root_cause"),
                            "service_chain": enrichment.get("service_chain"),
                            "impacted_services": enrichment.get("impacted_services"),
                            "suggested_action": enrichment.get("suggested_action")
                        })

                    # Publish to RabbitMQ
                    if rabbitmq_publisher.is_connected():
                        rabbitmq_publisher.publish_anomaly_alert(anomaly)
                    all_anomalies.append(anomaly)
        if all_anomalies:
            logger.info(f"✅ Detected {len(all_anomalies)} anomalies across {len(services_to_check)} services")
        return all_anomalies

    def get_service_status(self) -> Dict[str, Any]:
        """Get detailed status of all services and their detection modes"""
        ml_services = detector.get_trained_services()
        db_services = db.get_all_services()
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
                mode = "ml"
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
