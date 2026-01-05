import { BackendClient } from '../services/backend-client';

/**
 * Tool: crear_reserva
 * Crea una nueva reserva en el sistema
 */
export const crearReservaTool = {
  name: 'crear_reserva',
  description: 'Crea una nueva reserva en el sistema. Requiere un cliente válido, servicio, fecha y duración. Valida automáticamente la disponibilidad y existencia del cliente.',
  inputSchema: {
    type: 'object',
    properties: {
      clienteId: {
        type: 'number',
        description: 'ID del cliente que realizará la reserva',
      },
      servicioNombre: {
        type: 'string',
        description: 'Nombre del servicio a reservar (ej: "Corte de cabello", "Masaje", "Consulta")',
      },
      fechaReserva: {
        type: 'string',
        description: 'Fecha y hora de la reserva en formato ISO 8601 (ej: 2026-01-15T10:00:00Z)',
      },
      duracionMinutos: {
        type: 'number',
        description: 'Duración de la reserva en minutos (por defecto 60)',
        default: 60,
      },
      notas: {
        type: 'string',
        description: 'Notas adicionales sobre la reserva (opcional)',
      },
    },
    required: ['clienteId', 'servicioNombre', 'fechaReserva'],
  },
  
  async execute(
    params: {
      clienteId: number;
      servicioNombre: string;
      fechaReserva: string;
      duracionMinutos?: number;
      notas?: string;
    },
    backendClient: BackendClient
  ) {
    try {
      // 1. Validar que el cliente existe
      const cliente = await backendClient.buscarClientePorId(params.clienteId);
      if (!cliente) {
        return {
          success: false,
          error: `No se encontró un cliente con ID ${params.clienteId}`,
          sugerencia: 'Primero busque el cliente usando buscar_cliente',
        };
      }

      if (!cliente.activo) {
        return {
          success: false,
          error: `El cliente ${cliente.nombre} no está activo`,
        };
      }

      // 2. Validar que la fecha sea futura
      const fechaSolicitada = new Date(params.fechaReserva);
      if (fechaSolicitada <= new Date()) {
        return {
          success: false,
          error: 'La fecha de reserva debe ser futura',
        };
      }

      // 3. Validar disponibilidad
      const duracion = params.duracionMinutos || 60;
      const disponibilidad = await backendClient.validarDisponibilidad(params.fechaReserva, duracion);
      
      if (!disponibilidad.disponible) {
        return {
          success: false,
          error: 'La fecha y hora solicitada no está disponible',
          conflictos: disponibilidad.conflictos,
          reservasConflictivas: disponibilidad.reservasConflictivas,
          sugerencia: 'Use validar_disponibilidad para encontrar horarios disponibles',
        };
      }

      // 4. Crear la reserva
      const reserva = await backendClient.crearReserva({
        clienteId: params.clienteId,
        servicioNombre: params.servicioNombre,
        fechaReserva: params.fechaReserva,
        duracionMinutos: duracion,
        notas: params.notas,
      });

      return {
        success: true,
        data: reserva,
        message: `Reserva creada exitosamente para ${cliente.nombre}`,
        detalles: {
          reservaId: reserva.id,
          cliente: cliente.nombre,
          servicio: reserva.servicioNombre,
          fecha: new Date(reserva.fechaReserva).toLocaleString('es-ES'),
          duracion: `${reserva.duracionMinutos} minutos`,
          estado: reserva.estado,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error al crear la reserva',
      };
    }
  },
};

