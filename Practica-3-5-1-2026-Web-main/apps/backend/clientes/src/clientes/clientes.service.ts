import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { Cliente } from './entidades/cliente.entidad';

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
  ) {}

  /**
   * Crear un nuevo cliente
   */
  async crearCliente(crearClienteDto: CrearClienteDto): Promise<Cliente> {
    // Verificar si el email ya existe
    const clienteExistente = await this.clienteRepository.findOne({
      where: { email: crearClienteDto.email },
    });

    if (clienteExistente) {
      throw new ConflictException(`Ya existe un cliente con el email ${crearClienteDto.email}`);
    }

    const nuevoCliente = this.clienteRepository.create(crearClienteDto);
    const clienteGuardado = await this.clienteRepository.save(nuevoCliente);
    
    this.logger.log(`Cliente creado: ${clienteGuardado.id} - ${clienteGuardado.nombre}`);
    return clienteGuardado;
  }

  /**
   * Obtener todos los clientes activos (no eliminados)
   */
  async obtenerTodosLosClientes(): Promise<Cliente[]> {
    return await this.clienteRepository.find({
      where: { fechaEliminacion: IsNull() },
      order: { fechaCreacion: 'DESC' },
    });
  }

  /**
   * Obtener un cliente por ID
   */
  async obtenerClientePorId(id: number): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { id, fechaEliminacion: IsNull() },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return cliente;
  }

  /**
   * Buscar cliente por email
   */
  async buscarPorEmail(email: string): Promise<Cliente> {
    const cliente = await this.clienteRepository.findOne({
      where: { email, fechaEliminacion: IsNull() },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con email ${email} no encontrado`);
    }

    return cliente;
  }

  /**
   * Buscar clientes por nombre (búsqueda parcial)
   */
  async buscarPorNombre(nombre: string): Promise<Cliente[]> {
    const clientes = await this.clienteRepository.find({
      where: { 
        nombre: Like(`%${nombre}%`),
        fechaEliminacion: IsNull() 
      },
      order: { fechaCreacion: 'DESC' },
    });

    return clientes;
  }

  /**
   * Actualizar un cliente
   */
  async actualizarCliente(id: number, actualizarClienteDto: ActualizarClienteDto): Promise<Cliente> {
    const cliente = await this.obtenerClientePorId(id);

    // Si se está actualizando el email, verificar que no exista
    if (actualizarClienteDto.email && actualizarClienteDto.email !== cliente.email) {
      const emailExistente = await this.clienteRepository.findOne({
        where: { email: actualizarClienteDto.email },
      });

      if (emailExistente) {
        throw new ConflictException(`Ya existe un cliente con el email ${actualizarClienteDto.email}`);
      }
    }

    Object.assign(cliente, actualizarClienteDto);
    const clienteActualizado = await this.clienteRepository.save(cliente);
    
    this.logger.log(`Cliente actualizado: ${clienteActualizado.id} - ${clienteActualizado.nombre}`);
    return clienteActualizado;
  }

  /**
   * Eliminar un cliente (soft delete)
   */
  async eliminarCliente(id: number): Promise<{ mensaje: string }> {
    const cliente = await this.obtenerClientePorId(id);
    
    cliente.fechaEliminacion = new Date();
    cliente.activo = false;
    await this.clienteRepository.save(cliente);
    
    this.logger.log(`Cliente eliminado (soft delete): ${cliente.id} - ${cliente.nombre}`);
    return { mensaje: `Cliente ${cliente.nombre} eliminado exitosamente` };
  }
}
