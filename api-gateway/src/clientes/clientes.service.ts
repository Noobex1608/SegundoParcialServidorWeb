import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const host = this.configService.get('MICROSERVICIO_CLIENTES_HOST', 'localhost');
    const port = this.configService.get('MICROSERVICIO_CLIENTES_PORT', '3001');
    this.baseUrl = `http://${host}:${port}/clientes`;
    this.logger.log(`🔗 Conectando a Microservicio Clientes: ${this.baseUrl}`);
  }

  /**
   * Crear un nuevo cliente
   */
  async crearCliente(crearClienteDto: any) {
    try {
      this.logger.log('📤 Reenviando petición: POST /clientes');
      const response = await firstValueFrom(
        this.httpService.post(this.baseUrl, crearClienteDto).pipe(
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
   * Obtener todos los clientes
   */
  async obtenerTodosLosClientes() {
    try {
      this.logger.log('📤 Reenviando petición: GET /clientes');
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
   * Obtener cliente por ID
   */
  async obtenerClientePorId(id: number) {
    try {
      this.logger.log(`📤 Reenviando petición: GET /clientes/${id}`);
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
   * Actualizar cliente
   */
  async actualizarCliente(id: number, actualizarClienteDto: any) {
    try {
      this.logger.log(`📤 Reenviando petición: PATCH /clientes/${id}`);
      const response = await firstValueFrom(
        this.httpService.patch(`${this.baseUrl}/${id}`, actualizarClienteDto).pipe(
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
   * Eliminar cliente
   */
  async eliminarCliente(id: number) {
    try {
      this.logger.log(`📤 Reenviando petición: DELETE /clientes/${id}`);
      const response = await firstValueFrom(
        this.httpService.delete(`${this.baseUrl}/${id}`).pipe(
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
      this.logger.error('❌ Microservicio de clientes no disponible');
      throw new HttpException(
        'Microservicio de clientes no disponible. Intente nuevamente.',
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
