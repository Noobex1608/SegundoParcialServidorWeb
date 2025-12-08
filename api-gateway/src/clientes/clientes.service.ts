import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(
    @Inject('CLIENTES_SERVICE') private readonly clientesService: ClientProxy,
  ) {
    this.logger.log('🐰 Conectado a Microservicio Clientes vía RabbitMQ');
  }

  /**
   * Crear un nuevo cliente
   */
  async crearCliente(crearClienteDto: any) {
    try {
      this.logger.log('📤 Enviando mensaje RabbitMQ: crear_cliente');
      return await firstValueFrom(
        this.clientesService.send('crear_cliente', crearClienteDto).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de clientes no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener todos los clientes
   */
  async obtenerTodosLosClientes() {
    try {
      this.logger.log('📤 Enviando mensaje RabbitMQ: obtener_clientes');
      return await firstValueFrom(
        this.clientesService.send('obtener_clientes', {}).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de clientes no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtener cliente por ID
   */
  async obtenerClientePorId(id: number) {
    try {
      this.logger.log(`📤 Enviando mensaje RabbitMQ: obtener_cliente_por_id ${id}`);
      return await firstValueFrom(
        this.clientesService.send('obtener_cliente_por_id', { id }).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de clientes no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Actualizar cliente
   */
  async actualizarCliente(id: number, actualizarClienteDto: any) {
    try {
      this.logger.log(`📤 Enviando mensaje RabbitMQ: actualizar_cliente ${id}`);
      return await firstValueFrom(
        this.clientesService.send('actualizar_cliente', { id, ...actualizarClienteDto }).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de clientes no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Eliminar cliente
   */
  async eliminarCliente(id: number) {
    try {
      this.logger.log(`📤 Enviando mensaje RabbitMQ: eliminar_cliente ${id}`);
      return await firstValueFrom(
        this.clientesService.send('eliminar_cliente', { id }).pipe(
          timeout(10000),
          catchError((error) => {
            this.logger.error(`❌ Error RabbitMQ: ${error.message}`);
            throw new ServiceUnavailableException('Servicio de clientes no disponible');
          }),
        ),
      );
    } catch (error) {
      throw error;
    }
  }
}
