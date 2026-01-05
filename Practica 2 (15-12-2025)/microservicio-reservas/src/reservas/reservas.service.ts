import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, retry, catchError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Reserva, EstadoReserva } from './entidades/reserva.entidad';
import { CrearReservaDto } from './dto/crear-reserva.dto';
import { IdempotenciaService } from '../idempotencia/idempotencia.service';
import { WebhookPublisherService } from '../webhooks/webhook-publisher.service';

@Injectable()
export class ReservasService {
  private readonly logger = new Logger(ReservasService.name);

  constructor(
    @InjectRepository(Reserva)
    private readonly reservaRepository: Repository<Reserva>,
    @Inject('CLIENTES_SERVICE')
    private readonly clientesService: ClientProxy,
    private readonly idempotenciaService: IdempotenciaService,
    private readonly webhookPublisher: WebhookPublisherService,
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
    
    let validacionCliente: { existe: boolean; activo: boolean; cliente?: any };
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

      this.logger.log(`📥 Respuesta recibida de microservicio clientes: ${JSON.stringify(validacionCliente)}`);

      if (!validacionCliente || !validacionCliente.existe || !validacionCliente.activo) {
        throw new BadRequestException(`El cliente con ID ${crearReservaDto.clienteId} no existe o no está activo`);
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`❌ Error fatal al validar cliente: ${error.message}`);
      throw new BadRequestException('Error al validar el cliente. Intente nuevamente.');
    }
    
    // Extraer datos del cliente para el webhook
    const clienteData = validacionCliente.cliente;

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
    
    // 7. PUBLICAR WEBHOOK: reserva.creada (ASÍNCRONO - NO BLOQUEAR)
    setImmediate(async () => {
      try {
        await this.webhookPublisher.publishEvent(
          'reserva.creada',
          {
            id: reservaGuardada.id,
            clienteId: reservaGuardada.clienteId,
            // ✅ Incluir datos del cliente para el email
            clienteNombre: clienteData?.nombre,
            clienteEmail: clienteData?.email,
            clienteTelefono: clienteData?.telefono,
            servicioNombre: reservaGuardada.servicioNombre,
            fechaReserva: reservaGuardada.fechaReserva,
            duracionMinutos: reservaGuardada.duracionMinutos,
            estado: reservaGuardada.estado,
            notas: reservaGuardada.notas,
            fechaCreacion: reservaGuardada.fechaCreacion,
          },
          'microservice-reservas'
        );
        this.logger.log(`📤 Webhook publicado para reserva ${reservaGuardada.id}`);
      } catch (error) {
        this.logger.error(`⚠️ Error publicando webhook: ${error.message}`);
      }
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

    // Obtener datos del cliente para el webhook
    let clienteData: any = null;
    try {
      const validacionCliente = await firstValueFrom(
        this.clientesService.send('validar_cliente', { id: reserva.clienteId }).pipe(
          timeout(5000),
          catchError(() => {
            this.logger.warn(`⚠️ No se pudo obtener datos del cliente para el webhook`);
            return [null];
          })
        )
      );
      clienteData = validacionCliente?.cliente;
    } catch (error) {
      this.logger.warn(`⚠️ Error obteniendo cliente: ${error.message}`);
    }

    reserva.estado = EstadoReserva.CANCELADA;
    reserva.fechaCancelacion = new Date();
    const reservaCancelada = await this.reservaRepository.save(reserva);
    
    // PUBLICAR WEBHOOK: reserva.cancelada (ASÍNCRONO - NO BLOQUEAR)
    setImmediate(async () => {
      try {
        await this.webhookPublisher.publishEvent(
          'reserva.cancelada',
          {
            id: reservaCancelada.id,
            clienteId: reservaCancelada.clienteId,
            // ✅ Incluir datos del cliente para el email
            clienteNombre: clienteData?.nombre,
            clienteEmail: clienteData?.email,
            clienteTelefono: clienteData?.telefono,
            servicioNombre: reservaCancelada.servicioNombre,
            fechaReserva: reservaCancelada.fechaReserva,
            estado: reservaCancelada.estado,
            fechaCancelacion: reservaCancelada.fechaCancelacion,
          },
          'microservice-reservas'
        );
        this.logger.log(`📤 Webhook publicado para cancelación de reserva ${reservaCancelada.id}`);
      } catch (error) {
        this.logger.error(`⚠️ Error publicando webhook: ${error.message}`);
      }
    });
    
    this.logger.log(`❌ Reserva cancelada: ${reserva.id}`);
    return { mensaje: `Reserva ${reserva.id} cancelada exitosamente` };
  }
}
