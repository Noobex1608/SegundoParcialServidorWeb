import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ReservasService {
  private readonly logger = new Logger(ReservasService.name);
  private readonly reservasUrl: string;

  constructor(private readonly httpService: HttpService) {
    const host = process.env.MICROSERVICIO_RESERVAS_HOST || 'localhost';
    const port = process.env.MICROSERVICIO_RESERVAS_PORT || '3003';
    this.reservasUrl = `http://${host}:${port}/reservas`;
    this.logger.log(`🌐 Conectado a Microservicio Reservas: ${this.reservasUrl}`);
  }

  /**
   * Crear una nueva reserva
   */
  async crearReserva(crearReservaDto: any, idempotencyKey?: string) {
    try {
      this.logger.log('📤 Enviando petición HTTP: POST /reservas');
      if (idempotencyKey) {
        this.logger.log(`🔑 Usando clave de idempotencia: ${idempotencyKey}`);
      }
      
      const headers: any = {};
      if (idempotencyKey) {
        headers['x-idempotency-key'] = idempotencyKey;
      }

      const response = await firstValueFrom(
        this.httpService.post(this.reservasUrl, crearReservaDto, { headers })
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de reservas no disponible');
    }
  }

  /**
   * Obtener todas las reservas
   */
  async obtenerTodasLasReservas() {
    try {
      this.logger.log('📤 Enviando petición HTTP: GET /reservas');
      const response = await firstValueFrom(
        this.httpService.get(this.reservasUrl)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de reservas no disponible');
    }
  }

  /**
   * Obtener reserva por ID
   */
  async obtenerReservaPorId(id: number) {
    try {
      this.logger.log(`📤 Enviando petición HTTP: GET /reservas/${id}`);
      const response = await firstValueFrom(
        this.httpService.get(`${this.reservasUrl}/${id}`)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de reservas no disponible');
    }
  }

  /**
   * Obtener reservas por cliente
   */
  async obtenerReservasPorCliente(clienteId: number) {
    try {
      this.logger.log(`📤 Enviando petición HTTP: GET /reservas/cliente/${clienteId}`);
      const response = await firstValueFrom(
        this.httpService.get(`${this.reservasUrl}/cliente/${clienteId}`)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de reservas no disponible');
    }
  }

  /**
   * Cancelar reserva
   */
  async cancelarReserva(id: number) {
    try {
      this.logger.log(`📤 Enviando petición HTTP: PATCH /reservas/${id}/cancelar`);
      const response = await firstValueFrom(
        this.httpService.patch(`${this.reservasUrl}/${id}/cancelar`)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de reservas no disponible');
    }
  }
}
