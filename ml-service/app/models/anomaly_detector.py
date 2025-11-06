import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple, Any, Optional
import logging
from datetime import datetime
from app.services.model_storage import model_storage

logger = logging.getLogger(__name__)

class AnomalyDetector:
    def __init__(self, contamination: float = 0.02):
        self.contamination = contamination
        self.models: Dict[str, IsolationForest] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        self.feature_columns = [
            'response_time_ms',
            'status_code',
            'error_count',
            'response_size_bytes'
        ]
        self.last_training = {}
        self.model_versions = {}
        logger.info(f"Initialized AnomalyDetector with contamination={contamination}")
    
    def load_saved_models(self):
        """Load all previously saved models at startup"""
        logger.info("Loading saved models from disk...")
        services = model_storage.list_services()
        
        if not services:
            logger.info("No saved models found")
            return
        
        for service in services:
            result = model_storage.load_model(service)
            if result:
                model, scaler, meta = result
                self.models[service] = model
                self.scalers[service] = scaler
                self.last_training[service] = meta['timestamp']
                self.model_versions[service] = meta['version']
                logger.info(f"✅ Loaded saved model for {service}: {meta['version']}")
    
    def prepare_features(self, metrics: List[Dict[str, Any]]) -> pd.DataFrame:
        """Convert raw metrics to feature DataFrame"""
        df = pd.DataFrame(metrics)
        df['response_size_bytes'] = df['response_size_bytes'].fillna(0)
        features = df[self.feature_columns].copy()
        return features
    
    def train(self, service: str, metrics: List[Dict[str, Any]], save_model: bool = True) -> bool:
        """
        Train Isolation Forest model for a specific service
        """
        if len(metrics) < 10:
            logger.warning(f"Not enough samples for {service}: {len(metrics)}")
            return False
        
        try:
            features = self.prepare_features(metrics)
            
            # Initialize scaler
            scaler = StandardScaler()
            scaled_features = scaler.fit_transform(features)
            
            # Train Isolation Forest
            model = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=100,
                max_samples=min(256, len(metrics)),
                n_jobs=-1
            )
            model.fit(scaled_features)
            
            # Store in memory
            self.models[service] = model
            self.scalers[service] = scaler
            self.last_training[service] = datetime.now().isoformat()
            
            # Persist to disk
            if save_model:
                version = model_storage.save_model(
                    service, model, scaler, 
                    len(metrics), self.feature_columns
                )
                self.model_versions[service] = version
            
            logger.info(f"✅ Trained model for {service} with {len(metrics)} samples")
            return True
            
        except Exception as e:
            logger.error(f"Failed to train model for {service}: {e}")
            return False
    
    def predict(self, service: str, metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Detect anomalies in metrics"""
        if service not in self.models:
            logger.warning(f"No trained model for {service}")
            return []
        
        try:
            features = self.prepare_features(metrics)
            scaled_features = self.scalers[service].transform(features)
            
            # Predict
            predictions = self.models[service].predict(scaled_features)
            scores = self.models[service].decision_function(scaled_features)
            
            # Normalize scores
            anomaly_scores = 1 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-10)
            
            # Create alerts
            anomalies = []
            for idx, (prediction, score) in enumerate(zip(predictions, anomaly_scores)):
                if prediction == -1:
                    metric = metrics[idx]
                    anomalies.append({
                        'metric_id': metric['id'],
                        'service': service,
                        'trace_id': metric.get('trace_id'),
                        'method': metric.get('method'),
                        'path': metric.get('path'),
                        'anomaly_score': float(score),
                        'detection_method': 'isolation_forest',
                        'model_version': self.model_versions.get(service, 'unknown'),
                        'timestamp': metric['timestamp'].isoformat(),
                        'details': {
                            'response_time_ms': metric['response_time_ms'],
                            'status_code': metric['status_code'],
                            'error_count': metric['error_count'],
                            'response_size_bytes': metric.get('response_size_bytes', 0)
                        }
                    })
            
            if anomalies:
                logger.info(f"Detected {len(anomalies)} anomalies for {service}")
            
            return anomalies
            
        except Exception as e:
            logger.error(f"Failed to predict anomalies for {service}: {e}")
            return []
    
    def is_trained(self, service: str) -> bool:
        """Check if model is trained for a service"""
        return service in self.models
    
    def get_trained_services(self) -> List[str]:
        """Get list of services with trained models"""
        return list(self.models.keys())

# Singleton instance
detector = AnomalyDetector()
