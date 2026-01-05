import { Injectable, Logger, Inject, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';

@Injectable()
export class ReservasService {
  private readonly logger = new Logger(ReservasService.name);

  constructor(
    @Inject('RESERVAS_SERVICE') private readonly reservasService: ClientProxy,
  ) {
    this.logger.log('🐰 Conectado a Microservicio Reservas vía RabbitMQ');
  }

  /**
   * Crear una nueva reserva
   * El microservicio se encargará de la validación vía RabbitMQ y la idempotencia
   */
  async crearReserva(crearReservaDto: any, idempotencyKey?: string) {
    try {
      this.logger.log('📤 Enviando mensaje RabbitMQ: crear_reserva');
      if (idempotencyKey) {
        this.logger.log(`🔑 Usando clave de idempotencia: ${idempotencyKey}`);
      }
      
      return await firstValueFrom(
        this.reservasService.send('crear_reserva', { 
          ...crearReservaDto, 
          idempotencyKey 
        }).pipe(
          timeout(15000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de reservas no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todas las reservas
   */
  async obtenerTodasLasReservas() {
    try {
      this.logger.log('📤 Enviando mensaje RabbitMQ: obtener_reservas');
      return await firstValueFrom(
        this.reservasService.send('obtener_reservas', {}).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de reservas no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener reserva por ID
   */
  async obtenerReservaPorId(id: number) {
    try {
      this.logger.log(`📤 Enviando mensaje RabbitMQ: obtener_reserva_por_id ${id}`);
      return await firstValueFrom(
        this.reservasService.send('obtener_reserva_por_id', { id }).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de reservas no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener reservas por cliente
   */
  async obtenerReservasPorCliente(clienteId: number) {
    try {
      this.logger.log(`📤 Enviando mensaje RabbitMQ: obtener_reservas_por_cliente ${clienteId}`);
      return await firstValueFrom(
        this.reservasService.send('obtener_reservas_por_cliente', { clienteId }).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de reservas no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancelar reserva
   */
  async cancelarReserva(id: number) {
    try {
      this.logger.log(`📤 Enviando mensaje RabbitMQ: cancelar_reserva ${id}`);
      return await firstValueFrom(
        this.reservasService.send('cancelar_reserva', { id }).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de reservas no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }
}
