import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, Headers } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
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

  // ============================================================
  // MessagePatterns para RabbitMQ (comunicación con API Gateway)
  // ============================================================

  /**
   * MessagePattern RabbitMQ: Crear reserva
   */
  @MessagePattern('crear_reserva')
  async crearReservaRabbitMQ(@Payload() data: any) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: crear_reserva');
    console.log('📨 Payload:', data);
    const { idempotencyKey, ...crearReservaDto } = data;
    return await this.reservasService.crearReserva(crearReservaDto, idempotencyKey);
  }

  /**
   * MessagePattern RabbitMQ: Obtener todas las reservas
   */
  @MessagePattern('obtener_reservas')
  async obtenerReservasRabbitMQ() {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: obtener_reservas');
    return await this.reservasService.obtenerTodasLasReservas();
  }

  /**
   * MessagePattern RabbitMQ: Obtener reserva por ID
   */
  @MessagePattern('obtener_reserva_por_id')
  async obtenerReservaPorIdRabbitMQ(@Payload() data: { id: number }) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: obtener_reserva_por_id');
    console.log('📨 ID:', data.id);
    return await this.reservasService.obtenerReservaPorId(data.id);
  }

  /**
   * MessagePattern RabbitMQ: Obtener reservas por cliente
   */
  @MessagePattern('obtener_reservas_por_cliente')
  async obtenerReservasPorClienteRabbitMQ(@Payload() data: { clienteId: number }) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: obtener_reservas_por_cliente');
    console.log('📨 Cliente ID:', data.clienteId);
    return await this.reservasService.obtenerReservasPorCliente(data.clienteId);
  }

  /**
   * MessagePattern RabbitMQ: Cancelar reserva
   */
  @MessagePattern('cancelar_reserva')
  async cancelarReservaRabbitMQ(@Payload() data: { id: number }) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: cancelar_reserva');
    console.log('📨 ID:', data.id);
    return await this.reservasService.cancelarReserva(data.id);
  }
}
