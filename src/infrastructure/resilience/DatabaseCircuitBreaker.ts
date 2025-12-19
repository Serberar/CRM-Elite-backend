/**
 * Circuit Breaker específico para operaciones de Base de Datos
 * FASE 3: Estabilidad y Resiliencia
 *
 * Proporciona una capa de protección para todas las operaciones de Prisma,
 * evitando cascada de fallos cuando la BD tiene problemas.
 */

import { CircuitBreaker, CircuitBreakerFactory, CircuitState, CircuitOpenError } from './CircuitBreaker';
import logger from '@infrastructure/observability/logger/logger';

/**
 * Wrapper del Circuit Breaker para operaciones de base de datos
 */
export class DatabaseCircuitBreaker {
  private circuitBreaker: CircuitBreaker;
  private static instance: DatabaseCircuitBreaker | null = null;

  private constructor() {
    this.circuitBreaker = CircuitBreakerFactory.forDatabase('prisma-database');
  }

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): DatabaseCircuitBreaker {
    if (!DatabaseCircuitBreaker.instance) {
      DatabaseCircuitBreaker.instance = new DatabaseCircuitBreaker();
    }
    return DatabaseCircuitBreaker.instance;
  }

  /**
   * Ejecuta una operación de base de datos protegida por el circuit breaker
   *
   * @example
   * ```typescript
   * const user = await dbCircuitBreaker.execute(() =>
   *   prisma.user.findUnique({ where: { id } })
   * );
   * ```
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await this.circuitBreaker.execute(operation);
    } catch (error) {
      // Re-lanzar CircuitOpenError sin modificar
      if (error instanceof CircuitOpenError) {
        logger.warn('Operación de BD rechazada - Circuit Breaker abierto');
        throw error;
      }

      // Para otros errores de BD, verificar si son recuperables
      if (this.isRecoverableError(error)) {
        logger.warn('Error recuperable de BD detectado', {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      throw error;
    }
  }

  /**
   * Verifica si un error es recuperable (no debe contar como fallo del circuito)
   */
  private isRecoverableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;

    // Errores de validación o lógica de negocio no son fallos de infraestructura
    const recoverablePatterns = [
      'Unique constraint',      // Violación de unicidad
      'Foreign key constraint', // Violación de FK
      'Record to update not found', // Registro no encontrado
      'P2002',                  // Prisma: violación unicidad
      'P2003',                  // Prisma: violación FK
      'P2025',                  // Prisma: registro no encontrado
    ];

    return recoverablePatterns.some((pattern) =>
      error.message.includes(pattern)
    );
  }

  /**
   * Obtiene el estado actual del circuit breaker
   */
  getState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Obtiene estadísticas del circuit breaker
   */
  getStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Verifica si el circuito está abierto
   */
  isOpen(): boolean {
    return this.circuitBreaker.getState() === CircuitState.OPEN;
  }

  /**
   * Verifica si el circuito está cerrado (funcionando normalmente)
   */
  isClosed(): boolean {
    return this.circuitBreaker.getState() === CircuitState.CLOSED;
  }

  /**
   * Reset manual del circuit breaker (para recuperación)
   */
  reset(): void {
    logger.info('Reset manual del Circuit Breaker de BD');
    this.circuitBreaker.reset();
  }

  /**
   * Abre manualmente el circuit breaker (para mantenimiento)
   */
  trip(): void {
    logger.info('Apertura manual del Circuit Breaker de BD');
    this.circuitBreaker.trip();
  }
}

/**
 * Instancia singleton exportada para uso directo
 */
export const dbCircuitBreaker = DatabaseCircuitBreaker.getInstance();
