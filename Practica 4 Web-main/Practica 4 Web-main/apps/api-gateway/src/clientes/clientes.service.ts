import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);
  private readonly clientesUrl: string;

  constructor(private readonly httpService: HttpService) {
    const host = process.env.MICROSERVICIO_CLIENTES_HOST || 'localhost';
    const port = process.env.MICROSERVICIO_CLIENTES_PORT || '3002';
    this.clientesUrl = `http://${host}:${port}/clientes`;
    this.logger.log(`🌐 Conectado a Microservicio Clientes: ${this.clientesUrl}`);
  }

  /**
   * Crear un nuevo cliente
   */
  async crearCliente(crearClienteDto: any) {
    try {
      this.logger.log('📤 Enviando petición HTTP: POST /clientes');
      const response = await firstValueFrom(
        this.httpService.post(this.clientesUrl, crearClienteDto)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de clientes no disponible');
    }
  }

  /**
   * Obtener todos los clientes
   */
  async obtenerTodosLosClientes() {
    try {
      this.logger.log('📤 Enviando petición HTTP: GET /clientes');
      const response = await firstValueFrom(
        this.httpService.get(this.clientesUrl)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de clientes no disponible');
    }
  }

  /**
   * Obtener cliente por ID
   */
  async obtenerClientePorId(id: number) {
    try {
      this.logger.log(`📤 Enviando petición HTTP: GET /clientes/${id}`);
      const response = await firstValueFrom(
        this.httpService.get(`${this.clientesUrl}/${id}`)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de clientes no disponible');
    }
  }

  /**
   * Actualizar cliente
   */
  async actualizarCliente(id: number, actualizarClienteDto: any) {
    try {
      this.logger.log(`📤 Enviando petición HTTP: PATCH /clientes/${id}`);
      const response = await firstValueFrom(
        this.httpService.patch(`${this.clientesUrl}/${id}`, actualizarClienteDto)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de clientes no disponible');
    }
  }

  /**
   * Eliminar cliente
   */
  async eliminarCliente(id: number) {
    try {
      this.logger.log(`📤 Enviando petición HTTP: DELETE /clientes/${id}`);
      const response = await firstValueFrom(
        this.httpService.delete(`${this.clientesUrl}/${id}`)
      );
      return response.data;
    } catch (error) {
      this.logger.error(`❌ Error HTTP: ${error.message}`);
      throw new ServiceUnavailableException('Servicio de clientes no disponible');
    }
  }
}
