import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Reserva, EstadoReserva } from './entidades/reserva.entidad';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { IdempotenciaService } from '../idempotencia/idempotencia.service';
import { WebhookEmitterService } from '../common/webhook-emitter.service';
@Injectable()
export class ReservasService {
  private readonly logger = new Logger(ReservasService.name);

  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    private readonly httpService: HttpService,
    private readonly idempotenciaService: IdempotenciaService,
    private readonly webhookEmitter: WebhookEmitterService,
  ) {}

  /**
   * Crear una nueva reserva con validación de cliente vía HTTP
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

    // 4. VALIDAR CLIENTE VÍA HTTP
    this.logger.log(`📤 Validando cliente ${crearReservaDto.clienteId} vía HTTP`);
    
    try {
      const clientesHost = process.env.MICROSERVICIO_CLIENTES_HOST || 'localhost';
      const clientesPort = process.env.MICROSERVICIO_CLIENTES_PORT || '3002';
      const clienteUrl = `http://${clientesHost}:${clientesPort}/clientes/${crearReservaDto.clienteId}`;
      
      const response = await firstValueFrom(
        this.httpService.get(clienteUrl)
      );
      
      const cliente = response.data;
      
      if (!cliente || !cliente.activo) {
        throw new BadRequestException(`El cliente con ID ${crearReservaDto.clienteId} no existe o no está activo`);
      }
      
      this.logger.log(`✅ Cliente validado: ${cliente.nombre}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`❌ Error al validar cliente: ${error.message}`);
      throw new BadRequestException(`No se pudo validar el cliente con ID ${crearReservaDto.clienteId}`);
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
    await this.webhookEmitter.emit('reserva_creada', {
      id: reservaGuardada.id,
      clienteId: reservaGuardada.clienteId,
      fechaReserva: reservaGuardada.fechaReserva,
      estado: reservaGuardada.estado,
      duracion: reservaGuardada.duracionMinutos,
      mensaje: 'Nueva reserva creada',
    });
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
   * Validar disponibilidad de una fecha
   */
  async validarDisponibilidad(fecha: Date): Promise<{ disponible: boolean; reservasExistentes: number }> {
    const inicioDelDia = new Date(fecha);
    inicioDelDia.setHours(0, 0, 0, 0);
    
    const finDelDia = new Date(fecha);
    finDelDia.setHours(23, 59, 59, 999);

    const reservasEnFecha = await this.reservaRepository
      .createQueryBuilder('reserva')
      .where('reserva.fechaReserva >= :inicio', { inicio: inicioDelDia })
      .andWhere('reserva.fechaReserva <= :fin', { fin: finDelDia })
      .andWhere('reserva.fechaCancelacion IS NULL')
      .andWhere('reserva.estado != :cancelada', { cancelada: EstadoReserva.CANCELADA })
      .getCount();

    // Consideramos que hay disponibilidad si hay menos de 10 reservas en el día
    const disponible = reservasEnFecha < 10;

    return {
      disponible,
      reservasExistentes: reservasEnFecha,
    };
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
