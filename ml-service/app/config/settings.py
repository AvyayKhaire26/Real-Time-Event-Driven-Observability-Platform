from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Server
    PORT: int = 5000
    ENVIRONMENT: str = "development"
    
    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "observability_events"
    DB_USER: str = "postgres"
    DB_PASSWORD: str = "postgres"
    
    # RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672"
    RABBITMQ_EXCHANGE: str = "observability.events"
    
    # ML Configuration
    TRAINING_WINDOW_MINUTES: int = 60
    TRAINING_INTERVAL_MINUTES: int = 5
    CONTAMINATION: float = 0.02
    MIN_SAMPLES: int = 50
    ANOMALY_THRESHOLD: float = 0.65
    
    class Config:
        env_file = ".env"

settings = Settings()
