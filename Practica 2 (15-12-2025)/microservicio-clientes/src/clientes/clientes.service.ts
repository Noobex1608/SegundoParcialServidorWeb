import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Cliente } from './entidades/cliente.entidad';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { WebhookPublisherService } from '../webhooks/webhook-publisher.service';

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(
    @InjectRepository(Cliente)
    private readonly clienteRepository: Repository<Cliente>,
    private readonly webhookPublisher: WebhookPublisherService,
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
    
    // PUBLICAR WEBHOOK: cliente.creado (ASÍNCRONO - NO BLOQUEAR)
    setImmediate(async () => {
      try {
        await this.webhookPublisher.publishEvent(
          'cliente.creado',
          {
            id: clienteGuardado.id,
            nombre: clienteGuardado.nombre,
            email: clienteGuardado.email,
            telefono: clienteGuardado.telefono,
            activo: clienteGuardado.activo,
            fechaCreacion: clienteGuardado.fechaCreacion,
          },
          'microservice-clientes'
        );
        this.logger.log(`📤 Webhook publicado para cliente ${clienteGuardado.id}`);
      } catch (error) {
        this.logger.error(`⚠️ Error publicando webhook: ${error.message}`);
      }
    });
    
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
   * Validar si un cliente existe y está activo (usado por RabbitMQ)
   */
  async validarClienteExiste(clienteId: number): Promise<{ existe: boolean; activo: boolean; cliente?: Cliente }> {
    this.logger.debug(`Validando existencia de cliente ID: ${clienteId}`);
    
    const cliente = await this.clienteRepository.findOne({
      where: { id: clienteId, fechaEliminacion: IsNull() },
    });

    if (!cliente) {
      this.logger.warn(`Cliente ID ${clienteId} no encontrado`);
      return { existe: false, activo: false };
    }

    this.logger.log(`Cliente ID ${clienteId} validado: existe=${true}, activo=${cliente.activo}`);
    return { 
      existe: true, 
      activo: cliente.activo,
      cliente: cliente,
    };
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
