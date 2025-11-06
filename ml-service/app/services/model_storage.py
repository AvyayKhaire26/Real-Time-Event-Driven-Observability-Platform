import joblib
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class ModelStorage:
    def __init__(self, storage_dir: str = "models"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
        self.metadata_file = self.storage_dir / "metadata.json"
        self.metadata = self._load_metadata()
    
    def _load_metadata(self) -> Dict[str, Any]:
        """Load model metadata"""
        if self.metadata_file.exists():
            with open(self.metadata_file, 'r') as f:
                return json.load(f)
        return {}
    
    def _save_metadata(self):
        """Save model metadata"""
        with open(self.metadata_file, 'w') as f:
            json.dump(self.metadata, f, indent=2)
    
    def save_model(self, service: str, model: Any, scaler: Any, 
                   training_samples: int, features: list) -> str:
        """
        Save trained model and scaler to disk
        
        Returns:
            Model version string
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        version = f"v_{timestamp}"
        
        # Create service directory
        service_dir = self.storage_dir / service
        service_dir.mkdir(exist_ok=True)
        
        # Save model and scaler
        model_path = service_dir / f"{version}_model.pkl"
        scaler_path = service_dir / f"{version}_scaler.pkl"
        
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        
        # Update metadata
        self.metadata[service] = {
            "version": version,
            "timestamp": datetime.now().isoformat(),
            "training_samples": training_samples,
            "features": features,
            "model_path": str(model_path),
            "scaler_path": str(scaler_path)
        }
        self._save_metadata()
        
        logger.info(f"Saved model for {service}: {version} ({training_samples} samples)")
        return version
    
    def load_model(self, service: str) -> Optional[tuple]:
        """
        Load latest model and scaler for a service
        
        Returns:
            (model, scaler, metadata) or None if not found
        """
        if service not in self.metadata:
            logger.warning(f"No saved model found for {service}")
            return None
        
        try:
            meta = self.metadata[service]
            model = joblib.load(meta['model_path'])
            scaler = joblib.load(meta['scaler_path'])
            
            logger.info(f"Loaded model for {service}: {meta['version']}")
            return (model, scaler, meta)
        
        except Exception as e:
            logger.error(f"Failed to load model for {service}: {e}")
            return None
    
    def has_model(self, service: str) -> bool:
        """Check if a model exists for a service"""
        return service in self.metadata
    
    def get_model_info(self, service: str) -> Optional[Dict[str, Any]]:
        """Get model metadata without loading the model"""
        return self.metadata.get(service)
    
    def list_services(self) -> list:
        """List all services with saved models"""
        return list(self.metadata.keys())

# Singleton instance
model_storage = ModelStorage()
