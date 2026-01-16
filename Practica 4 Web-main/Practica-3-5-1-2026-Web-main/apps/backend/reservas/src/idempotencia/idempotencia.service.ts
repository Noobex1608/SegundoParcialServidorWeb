import { Injectable, Inject, Logger } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';

/**
 * Servicio de Idempotencia
 * 
 * Implementa la estrategia "Idempotent Consumer" para garantizar que los mensajes
 * de RabbitMQ se procesen exactamente una vez, incluso si llegan duplicados.
 * 
 * Funcionamiento:
 * 1. Antes de procesar un mensaje, verifica si su clave ya existe en Redis
 * 2. Si existe, retorna el resultado cacheado (mensaje duplicado)
 * 3. Si no existe, procesa el mensaje y guarda la clave con TTL de 24 horas
 * 
 * Esto resuelve el problema de "At-least-once delivery" de RabbitMQ.
 */
@Injectable()
export class IdempotenciaService {
  private readonly logger = new Logger(IdempotenciaService.name);
  private readonly ttl: number;
  private readonly prefijo = 'idempotencia:';

  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
    private readonly configService: ConfigService,
  ) {
    // TTL por defecto: 24 horas (86400 segundos)
    this.ttl = this.configService.get<number>('REDIS_TTL', 86400);
  }

  /**
   * Verifica si una clave de idempotencia ya fue procesada
   * @param claveIdempotencia - UUID único del mensaje
   * @returns true si ya fue procesado, false si es nuevo
   */
  async yaFueProcesado(claveIdempotencia: string): Promise<boolean> {
    try {
      const clave = this.construirClave(claveIdempotencia);
      const existe = await this.redisClient.exists(clave);
      
      if (existe) {
        this.logger.warn(`⚠️  Mensaje duplicado detectado: ${claveIdempotencia}`);
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error al verificar idempotencia: ${error.message}`);
      // En caso de error con Redis, permitir el procesamiento (fail-open)
      return false;
    }
  }

  /**
   * Obtiene el resultado cacheado de un mensaje ya procesado
   * @param claveIdempotencia - UUID único del mensaje
   * @returns Resultado cacheado en formato JSON
   */
  async obtenerResultadoCacheado(claveIdempotencia: string): Promise<any> {
    try {
      const clave = this.construirClave(claveIdempotencia);
      const resultado = await this.redisClient.get(clave);
      
      if (resultado) {
        this.logger.log(`📦 Retornando resultado cacheado para: ${claveIdempotencia}`);
        return JSON.parse(resultado);
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error al obtener resultado cacheado: ${error.message}`);
      return null;
    }

  }

  /**
   * Marca un mensaje como procesado y guarda su resultado
   * @param claveIdempotencia - UUID único del mensaje
   * @param resultado - Resultado del procesamiento a cachear
   */
  async marcarComoProcesado(claveIdempotencia: string, resultado: any): Promise<void> {
    try {
      const clave = this.construirClave(claveIdempotencia);
      const valorSerializado = JSON.stringify(resultado);
      
      await this.redisClient.setEx(clave, this.ttl, valorSerializado);
      
      this.logger.log(`✅ Mensaje marcado como procesado: ${claveIdempotencia} (TTL: ${this.ttl}s)`);
    } catch (error) {
      this.logger.error(`Error al marcar como procesado: ${error.message}`);
      // No lanzamos error para no interrumpir el flujo principal
    }
  }

  /**
   * Elimina una clave de idempotencia (útil para testing)
   * @param claveIdempotencia - UUID único del mensaje
   */
  async eliminarClave(claveIdempotencia: string): Promise<void> {
    try {
      const clave = this.construirClave(claveIdempotencia);
      await this.redisClient.del(clave);
      this.logger.debug(`🗑️  Clave eliminada: ${claveIdempotencia}`);
    } catch (error) {
      this.logger.error(`Error al eliminar clave: ${error.message}`);
    }
  }

  /**
   * Obtiene todas las claves de idempotencia (útil para debugging)
   * @returns Array de claves existentes
   */
  async obtenerTodasLasClaves(): Promise<string[]> {
    try {
      const claves = await this.redisClient.keys(`${this.prefijo}*`);
      return claves.map(clave => clave.replace(this.prefijo, ''));
    } catch (error) {
      this.logger.error(`Error al obtener claves: ${error.message}`);
      return [];
    }
  }

  /**
   * Construye la clave completa con prefijo
   */
  private construirClave(claveIdempotencia: string): string {
    return `${this.prefijo}${claveIdempotencia}`;
  }
}
