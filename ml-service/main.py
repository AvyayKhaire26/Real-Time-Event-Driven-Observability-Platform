from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import logging
import schedule
import time
import threading
from app.config.settings import settings
from app.api.routes import router
from app.services.database import db
from app.services.rabbitmq import rabbitmq_publisher
from app.services.ml_service import ml_service

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] [ml-service] %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ML Anomaly Detection Service",
    description="Production-grade real-time anomaly detection with model persistence",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.on_event("startup")
async def startup_event():
    """Initialize connections and load saved models"""
    logger.info("=" * 60)
    logger.info("🚀 ML Anomaly Detection Service starting...")
    logger.info("=" * 60)
    
    try:
        # 1. Connect to database
        db.connect()
        
        # 2. Connect to RabbitMQ
        rabbitmq_publisher.connect()
        
        # 3. Load saved models (if any)
        ml_service.initialize()
        
        # 4. Run initial training with backfill
        logger.info("🤖 Running initial model training with intelligent backfill...")
        result = ml_service.train_all_services()
        
        if result['success']:
            logger.info(f"✅ Training complete: {result['message']}")
            if result.get('backfill_used'):
                logger.info(f"📊 Backfill used for: {result['backfill_used']}")
        else:
            logger.warning(f"⚠️  {result['message']}")
        
        # 5. Schedule periodic tasks
        schedule.every(settings.TRAINING_INTERVAL_MINUTES).minutes.do(
            ml_service.train_all_services
        )
        
        schedule.every(1).minutes.do(
            ml_service.detect_anomalies
        )
        
        # 6. Start scheduler in background
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(30)
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        logger.info("✅ Background scheduler started")
        
        # 7. Print status
        status = ml_service.get_service_status()
        logger.info("=" * 60)
        logger.info(f"📡 Port: {settings.PORT}")
        logger.info(f"🌍 Environment: {settings.ENVIRONMENT}")
        logger.info(f"🔄 Training interval: {settings.TRAINING_INTERVAL_MINUTES} minutes")
        logger.info(f"📊 Contamination: {settings.CONTAMINATION}")
        logger.info(f"🎯 Anomaly threshold: {settings.ANOMALY_THRESHOLD}")
        logger.info("=" * 60)
        logger.info(f"📈 Detection Status:")
        logger.info(f"   ✓ ML-enabled services: {status['ml_enabled']}")
        logger.info(f"   ✓ Statistical fallback: {status['statistical_fallback']}")
        logger.info(f"   ✓ Total services: {status['total_services']}")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Startup failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup connections"""
    logger.info("Shutting down ML service...")
    db.disconnect()
    rabbitmq_publisher.disconnect()
    logger.info("✅ Cleanup complete")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.ENVIRONMENT == "development"
    )
