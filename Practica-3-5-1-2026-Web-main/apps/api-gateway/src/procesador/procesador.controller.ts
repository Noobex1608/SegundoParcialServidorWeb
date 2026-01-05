import { Controller, Post, Body, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ProcesadorService } from './procesador.service';

/**
 * Controlador principal para procesar solicitudes en lenguaje natural
 */
@Controller('procesador')
export class ProcesadorController {
  constructor(private readonly procesadorService: ProcesadorService) {}

  /**
   * Endpoint principal: Procesar solicitud del usuario
   * POST /api/procesador
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async procesarSolicitud(@Body() body: { mensaje: string }) {
    const { mensaje } = body;

    if (!mensaje || mensaje.trim() === '') {
      return {
        success: false,
        error: 'El campo "mensaje" es requerido',
      };
    }

    return await this.procesadorService.procesarSolicitud(mensaje);
  }

  /**
   * Verificar estado del sistema
   * GET /api/procesador/estado
   */
  @Get('estado')
  async verificarEstado() {
    return await this.procesadorService.verificarEstado();
  }
}

