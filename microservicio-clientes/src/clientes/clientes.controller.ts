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

  /**
   * MessagePattern RabbitMQ: Validar existencia de cliente
   * Este es el punto de comunicación asíncrona con el microservicio de reservas
   */
  @MessagePattern('validar_cliente')
  async validarCliente(@Payload() data: { clienteId: number }) {
    return await this.clientesService.validarClienteExiste(data.clienteId);
  }
}
