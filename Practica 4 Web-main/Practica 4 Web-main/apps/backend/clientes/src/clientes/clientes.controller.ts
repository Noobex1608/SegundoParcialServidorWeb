import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
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
   * Endpoint HTTP: Buscar cliente por email
   */
  @Get('buscar/email/:email')
  async buscarPorEmail(@Param('email') email: string) {
    return await this.clientesService.buscarPorEmail(email);
  }

  /**
   * Endpoint HTTP: Buscar cliente por nombre
   */
  @Get('buscar/nombre/:nombre')
  async buscarPorNombre(@Param('nombre') nombre: string) {
    return await this.clientesService.buscarPorNombre(nombre);
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
}
