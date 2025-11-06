import numpy as np
import pandas as pd
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class StatisticalDetector:
    """
    Simple statistical anomaly detector using z-scores
    Used as fallback when ML model is not available
    """
    
    def __init__(self, z_threshold: float = 3.0):
        self.z_threshold = z_threshold
        self.feature_columns = [
            'response_time_ms',
            'status_code',
            'error_count',
            'response_size_bytes'
        ]
    
    def detect(self, metrics: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Detect anomalies using z-score method
        
        Args:
            metrics: List of recent metrics
            
        Returns:
            List of detected anomalies with scores
        """
        if len(metrics) < 10:
            logger.warning(f"Too few samples for statistical detection: {len(metrics)}")
            return []
        
        try:
            df = pd.DataFrame(metrics)
            df['response_size_bytes'] = df['response_size_bytes'].fillna(0)
            
            anomalies = []
            
            for idx, row in df.iterrows():
                metric = metrics[idx]
                anomaly_signals = []
                max_z_score = 0.0
                
                # Calculate z-scores for each feature
                for feature in self.feature_columns:
                    if feature in df.columns:
                        values = df[feature].values
                        mean = np.mean(values)
                        std = np.std(values)
                        
                        if std > 0:
                            z_score = abs((row[feature] - mean) / std)
                            
                            if z_score > self.z_threshold:
                                anomaly_signals.append({
                                    'feature': feature,
                                    'value': float(row[feature]),
                                    'z_score': float(z_score),
                                    'mean': float(mean),
                                    'std': float(std)
                                })
                                max_z_score = max(max_z_score, z_score)
                
                # If any feature is anomalous, flag the metric
                if anomaly_signals:
                    # Normalize z-score to 0-1 range for consistency with ML scores
                    normalized_score = min(max_z_score / 10.0, 1.0)
                    
                    anomalies.append({
                        'metric_id': metric['id'],
                        'service': metric['service'],
                        'trace_id': metric.get('trace_id'),
                        'method': metric.get('method'),
                        'path': metric.get('path'),
                        'anomaly_score': normalized_score,
                        'detection_method': 'statistical_zscore',
                        'timestamp': metric['timestamp'].isoformat(),
                        'details': {
                            'response_time_ms': metric['response_time_ms'],
                            'status_code': metric['status_code'],
                            'error_count': metric['error_count'],
                            'response_size_bytes': metric.get('response_size_bytes', 0),
                            'anomaly_signals': anomaly_signals
                        }
                    })
            
            if anomalies:
                logger.info(f"Statistical detector found {len(anomalies)} anomalies")
            
            return anomalies
        
        except Exception as e:
            logger.error(f"Statistical detection failed: {e}")
            return []

# Singleton instance
statistical_detector = StatisticalDetector()
