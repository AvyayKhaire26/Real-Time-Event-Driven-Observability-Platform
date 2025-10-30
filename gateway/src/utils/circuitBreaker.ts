import logger from "./logger";

enum CircuitState {
  CLOSED = "CLOSED",     // Normal operation
  OPEN = "OPEN",         // Failing, reject requests
  HALF_OPEN = "HALF_OPEN" // Testing recovery
}

interface CircuitBreakerConfig {
  threshold: number;      // Failures before opening
  timeout: number;        // Time before attempting recovery (ms)
  resetTimeout?: number;  // Time to reset success counter
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private config: CircuitBreakerConfig;
  private serviceName: string;

  constructor(serviceName: string, config: CircuitBreakerConfig) {
    this.serviceName = serviceName;
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info(`Circuit breaker HALF_OPEN for ${this.serviceName}`);
      } else {
        throw new Error(`Circuit breaker OPEN for ${this.serviceName}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
        logger.info(`Circuit breaker CLOSED for ${this.serviceName} - recovered`);
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0;

    if (this.failureCount >= this.config.threshold) {
      this.state = CircuitState.OPEN;
      logger.warn(`Circuit breaker OPEN for ${this.serviceName} - threshold reached`, {
        failures: this.failureCount,
        threshold: this.config.threshold
      });
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.config.timeout;
  }

  getState(): CircuitState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }
}

export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  getOrCreate(serviceName: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(serviceName, new CircuitBreaker(serviceName, config));
    }
    return this.breakers.get(serviceName)!;
  }

  get(serviceName: string): CircuitBreaker | undefined {
    return this.breakers.get(serviceName);
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();