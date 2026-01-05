import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { createHash } from 'crypto';

/**
 * Estados del Circuit Breaker.
 */
export enum CircuitState {
  CLOSED = 'CLOSED',       // Funcionando normalmente
  OPEN = 'OPEN',           // Circuito abierto (no enviar requests)
  HALF_OPEN = 'HALF_OPEN', // Periodo de prueba
}

/**
 * Configuración del Circuit Breaker.
 */
interface CircuitBreakerConfig {
  failureThreshold: number;     // Número de fallos consecutivos para abrir el circuito
  successThreshold: number;     // Número de éxitos en HALF_OPEN para cerrar
  timeout: number;              // Tiempo en ms antes de pasar de OPEN a HALF_OPEN
}

/**
 * Estado del Circuit Breaker para un endpoint.
 */
interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

/**
 * Servicio de Circuit Breaker con estado persistido en Redis.
 * 
 * Implementa el patrón Circuit Breaker para proteger el sistema
 * de continuar enviando requests a servicios externos que están fallando.
 * 
 * Estados:
 * - CLOSED: Funcionando normalmente, requests fluyen
 * - OPEN: Sistema detectado como caído, NO se envían requests
 * - HALF_OPEN: Periodo de prueba, se permite 1 request
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly prefix = 'circuit-breaker:';
  
  // Configuración por defecto
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,      // 5 fallos consecutivos → OPEN
    successThreshold: 2,      // 2 éxitos en HALF_OPEN → CLOSED
    timeout: 30000,           // 30 segundos antes de intentar HALF_OPEN
  };

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  /**
   * Verifica si se puede ejecutar un request a un endpoint.
   * @param endpoint URL del endpoint
   * @returns true si se puede ejecutar, false si el circuito está abierto
   */
  async canExecute(endpoint: string): Promise<boolean> {
    const state = await this.getState(endpoint);
    
    if (state.state === CircuitState.CLOSED) {
      // Circuito cerrado, permitir request
      return true;
    }
    
    if (state.state === CircuitState.OPEN) {
      // Verificar si ya pasó el timeout para intentar HALF_OPEN
      const now = Date.now();
      
      if (state.nextAttemptTime && now >= state.nextAttemptTime) {
        // Transición a HALF_OPEN
        await this.transitionToHalfOpen(endpoint);
        this.logger.log(`🟡 Circuito ${endpoint} → HALF_OPEN (intentando recuperación)`);
        return true;
      }
      
      // Circuito aún abierto
      this.logger.warn(`🔴 Circuito OPEN para ${endpoint}, bloqueando request`);
      return false;
    }
    
    if (state.state === CircuitState.HALF_OPEN) {
      // En HALF_OPEN, permitimos intentos de prueba
      return true;
    }
    
    return false;
  }

  /**
   * Registra un éxito en la ejecución.
   * @param endpoint URL del endpoint
   */
  async recordSuccess(endpoint: string): Promise<void> {
    const state = await this.getState(endpoint);
    
    if (state.state === CircuitState.HALF_OPEN) {
      // Incrementar contador de éxitos en HALF_OPEN
      state.successCount++;
      
      if (state.successCount >= this.defaultConfig.successThreshold) {
        // Suficientes éxitos → Cerrar el circuito
        await this.transitionToClosed(endpoint);
        this.logger.log(`🟢 Circuito ${endpoint} → CLOSED (recuperado exitosamente)`);
      } else {
        await this.setState(endpoint, state);
        this.logger.log(`🟡 Circuito ${endpoint} HALF_OPEN: ${state.successCount}/${this.defaultConfig.successThreshold} éxitos`);
      }
    } else if (state.state === CircuitState.CLOSED) {
      // En estado CLOSED, resetear contador de fallos si había alguno
      if (state.failureCount > 0) {
        state.failureCount = 0;
        await this.setState(endpoint, state);
      }
    }
  }

  /**
   * Registra un fallo en la ejecución.
   * @param endpoint URL del endpoint
   */
  async recordFailure(endpoint: string): Promise<void> {
    const state = await this.getState(endpoint);
    
    state.failureCount++;
    state.lastFailureTime = Date.now();
    
    if (state.state === CircuitState.HALF_OPEN) {
      // Un fallo en HALF_OPEN → Volver a OPEN
      await this.transitionToOpen(endpoint);
      this.logger.warn(`🔴 Circuito ${endpoint} → OPEN (fallo en HALF_OPEN)`);
    } else if (state.state === CircuitState.CLOSED) {
      // Verificar si alcanzamos el umbral de fallos
      if (state.failureCount >= this.defaultConfig.failureThreshold) {
        await this.transitionToOpen(endpoint);
        this.logger.error(`🔴 Circuito ${endpoint} → OPEN (${state.failureCount} fallos consecutivos)`);
      } else {
        await this.setState(endpoint, state);
        this.logger.warn(`⚠️ Circuito ${endpoint}: ${state.failureCount}/${this.defaultConfig.failureThreshold} fallos`);
      }
    }
  }

  /**
   * Obtiene el estado actual del circuit breaker para un endpoint.
   */
  async getState(endpoint: string): Promise<CircuitBreakerState> {
    try {
      const key = this.buildKey(endpoint);
      const data = await this.redisClient.get(key);
      
      if (!data) {
        // Estado inicial: CLOSED
        return {
          state: CircuitState.CLOSED,
          failureCount: 0,
          successCount: 0,
        };
      }
      
      return JSON.parse(data) as CircuitBreakerState;
    } catch (error) {
      this.logger.error(`Error obteniendo estado del circuit breaker: ${error.message}`);
      // En caso de error, asumir CLOSED (fail-open)
      return {
        state: CircuitState.CLOSED,
        failureCount: 0,
        successCount: 0,
      };
    }
  }

  /**
   * Obtiene el estado actual como string (para logging/debugging).
   */
  async getStateString(endpoint: string): Promise<string> {
    const state = await this.getState(endpoint);
    return state.state;
  }

  /**
   * Guarda el estado del circuit breaker.
   */
  private async setState(endpoint: string, state: CircuitBreakerState): Promise<void> {
    try {
      const key = this.buildKey(endpoint);
      const value = JSON.stringify(state);
      
      // TTL de 1 hora para auto-limpieza
      await this.redisClient.setEx(key, 3600, value);
    } catch (error) {
      this.logger.error(`Error guardando estado del circuit breaker: ${error.message}`);
    }
  }

  /**
   * Transición a estado OPEN.
   */
  private async transitionToOpen(endpoint: string): Promise<void> {
    const state: CircuitBreakerState = {
      state: CircuitState.OPEN,
      failureCount: this.defaultConfig.failureThreshold,
      successCount: 0,
      lastFailureTime: Date.now(),
      nextAttemptTime: Date.now() + this.defaultConfig.timeout,
    };
    
    await this.setState(endpoint, state);
  }

  /**
   * Transición a estado HALF_OPEN.
   */
  private async transitionToHalfOpen(endpoint: string): Promise<void> {
    const state: CircuitBreakerState = {
      state: CircuitState.HALF_OPEN,
      failureCount: 0,
      successCount: 0,
    };
    
    await this.setState(endpoint, state);
  }

  /**
   * Transición a estado CLOSED.
   */
  private async transitionToClosed(endpoint: string): Promise<void> {
    const state: CircuitBreakerState = {
      state: CircuitState.CLOSED,
      failureCount: 0,
      successCount: 0,
    };
    
    await this.setState(endpoint, state);
  }

  /**
   * Construye la clave de Redis para un endpoint.
   */
  private buildKey(endpoint: string): string {
    // Usar hash del endpoint para evitar problemas con caracteres especiales
    const hash = createHash('md5').update(endpoint).digest('hex');
    return `${this.prefix}${hash}`;
  }

  /**
   * Resetea manualmente el circuit breaker de un endpoint.
   * Útil para testing o intervención manual.
   */
  async reset(endpoint: string): Promise<void> {
    await this.transitionToClosed(endpoint);
    this.logger.log(`🔄 Circuit breaker reseteado para ${endpoint}`);
  }
}

