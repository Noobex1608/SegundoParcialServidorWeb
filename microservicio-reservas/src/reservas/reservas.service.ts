import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Reserva, EstadoReserva } from './entidades/reserva.entidad';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { IdempotenciaService } from '../idempotencia/idempotencia.service';

@Injectable()
export class ReservasService {
  private readonly logger = new Logger(ReservasService.name);

  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @Inject('CLIENTES_SERVICE')
    private readonly clientesService: ClientProxy,
    private readonly idempotenciaService: IdempotenciaService,
  ) {}

  /**
   * Crear una nueva reserva con validación de cliente vía RabbitMQ
   * e implementación de Idempotent Consumer
   */
  async crearReserva(crearReservaDto: CrearReservaDto, idempotenciaKey?: string): Promise<Reserva> {
    // 1. Generar o usar clave de idempotencia
    const claveIdempotencia = idempotenciaKey || uuidv4();
    
    // 2. VERIFICAR SI YA FUE PROCESADO (Idempotencia)
    const yaFueProcesado = await this.idempotenciaService.yaFueProcesado(claveIdempotencia);
    if (yaFueProcesado) {
      const resultadoCacheado = await this.idempotenciaService.obtenerResultadoCacheado(claveIdempotencia);
      if (resultadoCacheado) {
        this.logger.warn(`🔁 Mensaje duplicado ignorado. Retornando resultado cacheado: ${claveIdempotencia}`);
        return resultadoCacheado;
      }
    }

    // 3. Validar que la fecha de reserva sea futura
    const fechaReserva = new Date(crearReservaDto.fechaReserva);
    if (fechaReserva <= new Date()) {
      throw new BadRequestException('La fecha de reserva debe ser futura');
    }

    // 4. VALIDAR CLIENTE VÍA RABBITMQ (Comunicación asíncrona)
    this.logger.log(`📤 Enviando validación de cliente ${crearReservaDto.clienteId} vía RabbitMQ`);
    
    let validacionCliente;
    try {
      validacionCliente = await firstValueFrom(
        this.clientesService.send('validar_cliente', { id: crearReservaDto.clienteId }).pipe(
          timeout(10000), // Aumentar timeout a 10 segundos
          retry({
            count: 3,     // Reintentar hasta 3 veces
            delay: 2000,  // Esperar 2 segundos entre reintentos
          }),
          catchError((error) => {
            this.logger.error(`❌ Error al validar cliente vía RabbitMQ: ${error.message}`);
            
            // Manejar timeout específicamente
            if (error.name === 'TimeoutError') {
              throw new BadRequestException(
                'Servicio de validación de clientes no disponible. Por favor, intente más tarde.'
              );
            }
            
            throw new BadRequestException(`Error al validar cliente: ${error.message}`);
          })
        )
      );

      this.logger.log(`📥 Respuesta recibida de microservicio clientes: ${validacionCliente}`);

      if (!validacionCliente) {
        throw new BadRequestException(`El cliente con ID ${crearReservaDto.clienteId} no existe o no está activo`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`❌ Error fatal al validar cliente: ${error.message}`);
      throw new BadRequestException('Error al validar el cliente. Intente nuevamente.');
    }

    // 5. Crear la reserva
    const nuevaReserva = this.reservaRepository.create({
      ...crearReservaDto,
      fechaReserva,
      idempotenciaKey: claveIdempotencia,
      estado: EstadoReserva.CONFIRMADA,
      duracionMinutos: crearReservaDto.duracionMinutos || 60,
    });

    const reservaGuardada = await this.reservaRepository.save(nuevaReserva);
    
    // 6. MARCAR COMO PROCESADO EN REDIS (Idempotencia)
    await this.idempotenciaService.marcarComoProcesado(claveIdempotencia, reservaGuardada);
    
    this.logger.log(`✅ Reserva creada: ${reservaGuardada.id} para cliente ${reservaGuardada.clienteId}`);
    return reservaGuardada;
  }

  /**
   * Obtener todas las reservas activas (no canceladas)
   */
  async obtenerTodasLasReservas(): Promise<Reserva[]> {
    return await this.reservaRepository.find({
      where: { fechaCancelacion: IsNull() },
      order: { fechaReserva: 'ASC' },
    });
  }

  /**
   * Obtener una reserva por ID
   */
  async obtenerReservaPorId(id: number): Promise<Reserva> {
    const reserva = await this.reservaRepository.findOne({
      where: { id, fechaCancelacion: IsNull() },
    });

    if (!reserva) {
      throw new NotFoundException(`Reserva con ID ${id} no encontrada`);
    }

    return reserva;
  }

  /**
   * Obtener reservas de un cliente específico
   */
  async obtenerReservasPorCliente(clienteId: number): Promise<Reserva[]> {
    return await this.reservaRepository.find({
      where: { clienteId, fechaCancelacion: IsNull() },
      order: { fechaReserva: 'ASC' },
    });
  }

  /**
   * Cancelar una reserva (soft delete)
   */
  async cancelarReserva(id: number): Promise<{ mensaje: string }> {
    const reserva = await this.obtenerReservaPorId(id);
    
    if (reserva.estado === EstadoReserva.CANCELADA) {
      throw new BadRequestException('La reserva ya está cancelada');
    }

    if (reserva.estado === EstadoReserva.COMPLETADA) {
      throw new BadRequestException('No se puede cancelar una reserva completada');
    }

    reserva.estado = EstadoReserva.CANCELADA;
    reserva.fechaCancelacion = new Date();
    await this.reservaRepository.save(reserva);
    
    this.logger.log(`❌ Reserva cancelada: ${reserva.id}`);
    return { mensaje: `Reserva ${reserva.id} cancelada exitosamente` };
  }
}
