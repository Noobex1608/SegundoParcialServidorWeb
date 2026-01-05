import { BackendClient } from '../services/backend-client';

/**
 * Tool: validar_disponibilidad
 * Valida si una fecha está disponible para crear una reserva
 */
export const validarDisponibilidadTool = {
  name: 'validar_disponibilidad',
  description: 'Valida si una fecha y hora específica está disponible para crear una reserva. Verifica conflictos con reservas existentes.',
  inputSchema: {
    type: 'object',
    properties: {
      fechaReserva: {
        type: 'string',
        description: 'Fecha y hora de la reserva en formato ISO 8601 (ej: 2026-01-15T10:00:00Z)',
      },
      duracionMinutos: {
        type: 'number',
        description: 'Duración de la reserva en minutos (por defecto 60)',
        default: 60,
      },
    },
    required: ['fechaReserva'],
  },
  
  async execute(params: { fechaReserva: string; duracionMinutos?: number }, backendClient: BackendClient) {
    try {
      const duracion = params.duracionMinutos || 60;

      // Validar que la fecha sea futura
      const fechaSolicitada = new Date(params.fechaReserva);
      const ahora = new Date();

      if (fechaSolicitada <= ahora) {
        return {
          success: false,
          disponible: false,
          error: 'La fecha de reserva debe ser futura',
        };
      }

      // Validar formato de fecha
      if (isNaN(fechaSolicitada.getTime())) {
        return {
          success: false,
          disponible: false,
          error: 'Formato de fecha inválido. Use formato ISO 8601 (ej: 2026-01-15T10:00:00Z)',
        };
      }

      // Consultar disponibilidad en el backend
      const resultado = await backendClient.validarDisponibilidad(params.fechaReserva, duracion);

      if (resultado.disponible) {
        return {
          success: true,
          disponible: true,
          message: `La fecha ${fechaSolicitada.toLocaleString('es-ES')} está disponible`,
          duracionMinutos: duracion,
        };
      } else {
        return {
          success: true,
          disponible: false,
          message: `La fecha ${fechaSolicitada.toLocaleString('es-ES')} NO está disponible`,
          conflictos: resultado.conflictos,
          reservasConflictivas: resultado.reservasConflictivas,
          sugerencia: 'Por favor, elija otra fecha u horario',
        };
      }
    } catch (error: any) {
      return {
        success: false,
        disponible: false,
        error: error.message || 'Error al validar disponibilidad',
      };
    }
  },
};

