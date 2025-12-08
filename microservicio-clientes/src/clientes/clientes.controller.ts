import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ClientesService } from './clientes.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  /**
   * Endpoint HTTP: Crear cliente
   */
  @Post()
  async crearCliente(@Body() crearClienteDto: CrearClienteDto) {
    return await this.clientesService.crearCliente(crearClienteDto);
  }

  /**
   * Endpoint HTTP: Obtener todos los clientes
   */
  @Get()
  async obtenerTodosLosClientes() {
    return await this.clientesService.obtenerTodosLosClientes();
  }

  /**
   * Endpoint HTTP: Obtener cliente por ID
   */
  @Get(':id')
  async obtenerClientePorId(@Param('id', ParseIntPipe) id: number) {
    return await this.clientesService.obtenerClientePorId(id);
  }

  /**
   * Endpoint HTTP: Actualizar cliente
   */
  @Patch(':id')
  async actualizarCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() actualizarClienteDto: ActualizarClienteDto,
  ) {
    return await this.clientesService.actualizarCliente(id, actualizarClienteDto);
  }

  /**
   * Endpoint HTTP: Eliminar cliente
   */
  @Delete(':id')
  async eliminarCliente(@Param('id', ParseIntPipe) id: number) {
    return await this.clientesService.eliminarCliente(id);
  }

  // ============================================================
  // MessagePatterns para RabbitMQ (comunicación con API Gateway y Reservas)
  // ============================================================

  /**
   * MessagePattern RabbitMQ: Validar existencia de cliente
   * Usado por el microservicio de reservas
   */
  @MessagePattern('validar_cliente')
  async validarCliente(@Payload() data: { id: number }) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: validar_cliente');
    console.log('📨 Payload:', data);
    return await this.clientesService.validarClienteExiste(data.id);
  }

  /**
   * MessagePattern RabbitMQ: Crear cliente
   * Usado por el API Gateway
   */
  @MessagePattern('crear_cliente')
  async crearClienteRabbitMQ(@Payload() crearClienteDto: CrearClienteDto) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: crear_cliente');
    console.log('📨 Payload:', crearClienteDto);
    return await this.clientesService.crearCliente(crearClienteDto);
  }

  /**
   * MessagePattern RabbitMQ: Obtener todos los clientes
   */
  @MessagePattern('obtener_clientes')
  async obtenerClientesRabbitMQ() {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: obtener_clientes');
    return await this.clientesService.obtenerTodosLosClientes();
  }

  /**
   * MessagePattern RabbitMQ: Obtener cliente por ID
   */
  @MessagePattern('obtener_cliente_por_id')
  async obtenerClientePorIdRabbitMQ(@Payload() data: { id: number }) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: obtener_cliente_por_id');
    console.log('📨 ID:', data.id);
    return await this.clientesService.obtenerClientePorId(data.id);
  }

  /**
   * MessagePattern RabbitMQ: Actualizar cliente
   */
  @MessagePattern('actualizar_cliente')
  async actualizarClienteRabbitMQ(@Payload() data: any) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: actualizar_cliente');
    console.log('📨 Payload:', data);
    const { id, ...actualizarClienteDto } = data;
    return await this.clientesService.actualizarCliente(id, actualizarClienteDto);
  }

  /**
   * MessagePattern RabbitMQ: Eliminar cliente
   */
  @MessagePattern('eliminar_cliente')
  async eliminarClienteRabbitMQ(@Payload() data: { id: number }) {
    console.log('📨 Mensaje RabbitMQ recibido - Pattern: eliminar_cliente');
    console.log('📨 ID:', data.id);
    return await this.clientesService.eliminarCliente(data.id);
  }
}
