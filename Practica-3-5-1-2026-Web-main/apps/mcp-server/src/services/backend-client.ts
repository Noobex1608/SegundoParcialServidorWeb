import axios, { AxiosInstance } from 'axios';

/**
 * Cliente HTTP para comunicarse con los microservicios backend
 */
export class BackendClient {
  private clientesApi: AxiosInstance;
  private reservasApi: AxiosInstance;

  constructor() {
    const clientesHost = process.env.MICROSERVICIO_CLIENTES_HOST || 'localhost';
    const clientesPort = process.env.MICROSERVICIO_CLIENTES_PORT || '3002';
    
    const reservasHost = process.env.MICROSERVICIO_RESERVAS_HOST || 'localhost';
    const reservasPort = process.env.MICROSERVICIO_RESERVAS_PORT || '3003';

    this.clientesApi = axios.create({
      baseURL: `http://${clientesHost}:${clientesPort}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.reservasApi = axios.create({
      baseURL: `http://${reservasHost}:${reservasPort}`,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Buscar cliente por ID
   */
  async buscarClientePorId(id: number) {
    try {
      const response = await this.clientesApi.get(`/clientes/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(`Error al buscar cliente: ${error.message}`);
    }
  }

  /**
   * Buscar cliente por email
   */
  async buscarClientePorEmail(email: string) {
    try {
      const response = await this.clientesApi.get('/clientes');
      const clientes = response.data;
      return clientes.find((c: any) => c.email.toLowerCase() === email.toLowerCase());
    } catch (error: any) {
      throw new Error(`Error al buscar cliente por email: ${error.message}`);
    }
  }

  /**
   * Buscar cliente por nombre (búsqueda parcial)
   */
  async buscarClientePorNombre(nombre: string) {
    try {
      const response = await this.clientesApi.get('/clientes');
      const clientes = response.data;
      return clientes.filter((c: any) => 
        c.nombre.toLowerCase().includes(nombre.toLowerCase())
      );
    } catch (error: any) {
      throw new Error(`Error al buscar cliente por nombre: ${error.message}`);
    }
  }

  /**
   * Obtener todas las reservas
   */
  async obtenerReservas() {
    try {
      const response = await this.reservasApi.get('/reservas');
      return response.data;
    } catch (error: any) {
      throw new Error(`Error al obtener reservas: ${error.message}`);
    }
  }

  /**
   * Obtener reservas de un cliente
   */
  async obtenerReservasPorCliente(clienteId: number) {
    try {
      const response = await this.reservasApi.get(`/reservas/cliente/${clienteId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(`Error al obtener reservas del cliente: ${error.message}`);
    }
  }

  /**
   * Validar disponibilidad para una fecha específica
   */
  async validarDisponibilidad(fechaReserva: string, duracionMinutos: number = 60) {
    try {
      const response = await this.reservasApi.get('/reservas');
      const reservas = response.data;
      
      const fechaSolicitada = new Date(fechaReserva);
      const fechaFin = new Date(fechaSolicitada.getTime() + duracionMinutos * 60000);

      // Verificar si hay conflictos con reservas existentes
      const conflictos = reservas.filter((reserva: any) => {
        if (reserva.estado === 'cancelada') return false;
        
        const reservaInicio = new Date(reserva.fechaReserva);
        const reservaFin = new Date(reservaInicio.getTime() + reserva.duracionMinutos * 60000);

        // Verificar solapamiento
        return (
          (fechaSolicitada >= reservaInicio && fechaSolicitada < reservaFin) ||
          (fechaFin > reservaInicio && fechaFin <= reservaFin) ||
          (fechaSolicitada <= reservaInicio && fechaFin >= reservaFin)
        );
      });

      return {
        disponible: conflictos.length === 0,
        conflictos: conflictos.length,
        reservasConflictivas: conflictos,
      };
    } catch (error: any) {
      throw new Error(`Error al validar disponibilidad: ${error.message}`);
    }
  }

  /**
   * Crear una nueva reserva
   */
  async crearReserva(datos: {
    clienteId: number;
    servicioNombre: string;
    fechaReserva: string;
    duracionMinutos?: number;
    notas?: string;
  }) {
    try {
      const response = await this.reservasApi.post('/reservas', datos, {
        headers: {
          'X-Idempotency-Key': `mcp-${Date.now()}-${Math.random()}`,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(`Error al crear reserva: ${error.message}`);
    }
  }
}

