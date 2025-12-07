import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ClientesService } from './clientes.service';

@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  async crearCliente(@Body() crearClienteDto: any) {
    return await this.clientesService.crearCliente(crearClienteDto);
  }

  @Get()
  async obtenerTodosLosClientes() {
    return await this.clientesService.obtenerTodosLosClientes();
  }

  @Get(':id')
  async obtenerClientePorId(@Param('id', ParseIntPipe) id: number) {
    return await this.clientesService.obtenerClientePorId(id);
  }

  @Patch(':id')
  async actualizarCliente(
    @Param('id', ParseIntPipe) id: number,
    @Body() actualizarClienteDto: any,
  ) {
    return await this.clientesService.actualizarCliente(id, actualizarClienteDto);
  }

  @Delete(':id')
  async eliminarCliente(@Param('id', ParseIntPipe) id: number) {
    return await this.clientesService.eliminarCliente(id);
  }
}
