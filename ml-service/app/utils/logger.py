
import logging

def get_logger(name='ml-service'):
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('[%(asctime)s] %(levelname)s %(name)s: %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger

# Usage in other modules:
# logger = get_logger(__name__)
# logger.info('Starting anomaly detection')
# logger.error('Failed to fetch metrics')

