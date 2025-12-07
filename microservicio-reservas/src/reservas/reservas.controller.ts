import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Headers } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { CrearReservaDto } from './dto/crear-reserva.dto';

@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  /**
   * Endpoint HTTP: Crear reserva
   * Incluye validación de cliente vía RabbitMQ e idempotencia
   */
  @Post()
  async crearReserva(
    @Body() crearReservaDto: CrearReservaDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return await this.reservasService.crearReserva(crearReservaDto, idempotencyKey);
  }

  /**
   * Endpoint HTTP: Obtener todas las reservas
   */
  @Get()
  async obtenerTodasLasReservas() {
    return await this.reservasService.obtenerTodasLasReservas();
  }

  /**
   * Endpoint HTTP: Obtener reserva por ID
   */
  @Get(':id')
  async obtenerReservaPorId(@Param('id', ParseIntPipe) id: number) {
    return await this.reservasService.obtenerReservaPorId(id);
  }

  /**
   * Endpoint HTTP: Obtener reservas por cliente
   */
  @Get('cliente/:clienteId')
  async obtenerReservasPorCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return await this.reservasService.obtenerReservasPorCliente(clienteId);
  }

  /**
   * Endpoint HTTP: Cancelar reserva
   */
  @Patch(':id/cancelar')
  async cancelarReserva(@Param('id', ParseIntPipe) id: number) {
    return await this.reservasService.cancelarReserva(id);
  }
}
