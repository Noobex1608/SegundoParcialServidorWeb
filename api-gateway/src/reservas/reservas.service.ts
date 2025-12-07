import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ReservasService {
  private readonly logger = new Logger(ReservasService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get('MICROSERVICIO_RESERVAS_HOST', 'localhost');
    const port = this.configService.get('MICROSERVICIO_RESERVAS_PORT', '3002');
    this.baseUrl = `http://${host}:${port}/reservas`;
    this.logger.log(`🔗 Conectando a Microservicio Reservas: ${this.baseUrl}`);
  }

  /**
   * Crear una nueva reserva
   * El microservicio se encargará de la validación vía RabbitMQ y la idempotencia
   */
  async crearReserva(crearReservaDto: any, idempotencyKey?: string) {
    try {
      this.logger.log('📤 Reenviando petición: POST /reservas');
      
      // Construir headers, incluyendo la clave de idempotencia si existe
      const headers: any = {};
      if (idempotencyKey) {
        headers['x-idempotency-key'] = idempotencyKey;
        this.logger.log(`🔑 Usando clave de idempotencia: ${idempotencyKey}`);
      }
      
      const response = await firstValueFrom(
        this.httpService.post(this.baseUrl, crearReservaDto, { headers }).pipe(
          catchError((error: AxiosError) => {
            this.manejarError(error);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      throw this.manejarError(error);
    }
  }

  /**
   * Obtener todas las reservas
   */
  async obtenerTodasLasReservas() {
    try {
      this.logger.log('📤 Reenviando petición: GET /reservas');
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl).pipe(
          catchError((error: AxiosError) => {
            this.manejarError(error);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      throw this.manejarError(error);
    }
  }

  /**
   * Obtener reserva por ID
   */
  async obtenerReservaPorId(id: number) {
    try {
      this.logger.log(`📤 Reenviando petición: GET /reservas/${id}`);
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/${id}`).pipe(
          catchError((error: AxiosError) => {
            this.manejarError(error);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      throw this.manejarError(error);
    }
  }

  /**
   * Obtener reservas por cliente
   */
  async obtenerReservasPorCliente(clienteId: number) {
    try {
      this.logger.log(`📤 Reenviando petición: GET /reservas/cliente/${clienteId}`);
      const response = await firstValueFrom(
        this.httpService.get(`${this.baseUrl}/cliente/${clienteId}`).pipe(
          catchError((error: AxiosError) => {
            this.manejarError(error);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      throw this.manejarError(error);
    }
  }

  /**
   * Cancelar reserva
   */
  async cancelarReserva(id: number) {
    try {
      this.logger.log(`📤 Reenviando petición: PATCH /reservas/${id}/cancelar`);
      const response = await firstValueFrom(
        this.httpService.patch(`${this.baseUrl}/${id}/cancelar`).pipe(
          catchError((error: AxiosError) => {
            this.manejarError(error);
            throw error;
          }),
        ),
      );
      return response.data;
    } catch (error) {
      throw this.manejarError(error);
    }
  }

  /**
   * Manejo centralizado de errores HTTP
   */
  private manejarError(error: any): never {
    if (error.response) {
      // El microservicio respondió con un error
      this.logger.error(`❌ Error del microservicio: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      throw new HttpException(
        error.response.data,
        error.response.status,
      );
    } else if (error.request) {
      // No se recibió respuesta del microservicio
      this.logger.error('❌ Microservicio de reservas no disponible');
      throw new HttpException(
        'Microservicio de reservas no disponible. Intente nuevamente.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    } else {
      // Error en la configuración de la petición
      this.logger.error(`❌ Error inesperado: ${error.message}`);
      throw new HttpException(
        'Error interno del servidor',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
