import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Headers } from '@nestjs/common';
import { ReservasService } from './reservas.service';

@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservasService: ReservasService) {}

  @Post()
  async crearReserva(
    @Body() crearReservaDto: any,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return await this.reservasService.crearReserva(crearReservaDto, idempotencyKey);
  }

  @Get()
  async obtenerTodasLasReservas() {
    return await this.reservasService.obtenerTodasLasReservas();
  }

  @Get(':id')
  async obtenerReservaPorId(@Param('id', ParseIntPipe) id: number) {
    return await this.reservasService.obtenerReservaPorId(id);
  }

  @Get('cliente/:clienteId')
  async obtenerReservasPorCliente(@Param('clienteId', ParseIntPipe) clienteId: number) {
    return await this.reservasService.obtenerReservasPorCliente(clienteId);
  }

  @Patch(':id/cancelar')
  async cancelarReserva(@Param('id', ParseIntPipe) id: number) {
    return await this.reservasService.cancelarReserva(id);
  }
}
