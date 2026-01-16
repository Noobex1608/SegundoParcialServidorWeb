import { BackendClient } from '../services/backend-client';

/**
 * Tool: buscar_cliente
 * Permite buscar clientes por ID, email o nombre
 */
export const buscarClienteTool = {
  name: 'buscar_cliente',
  description: 'Busca información de un cliente en el sistema por ID, email o nombre. Retorna los datos del cliente si existe.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'ID único del cliente (opcional si se proporciona email o nombre)',
      },
      email: {
        type: 'string',
        description: 'Email del cliente para búsqueda exacta (opcional si se proporciona id o nombre)',
      },
      nombre: {
        type: 'string',
        description: 'Nombre del cliente para búsqueda parcial (opcional si se proporciona id o email)',
      },
    },
    required: [],
  },
  
  async execute(params: { id?: number; email?: string; nombre?: string }, backendClient: BackendClient) {
    try {
      // Validar que al menos un parámetro esté presente
      if (!params.id && !params.email && !params.nombre) {
        return {
          success: false,
          error: 'Debe proporcionar al menos uno de los siguientes: id, email o nombre',
        };
      }

      let resultado;

      // Búsqueda por ID (más específica)
      if (params.id) {
        const cliente = await backendClient.buscarClientePorId(params.id);
        if (!cliente) {
          return {
            success: false,
            error: `No se encontró un cliente con ID ${params.id}`,
          };
        }
        resultado = cliente;
      }
      // Búsqueda por email
      else if (params.email) {
        const cliente = await backendClient.buscarClientePorEmail(params.email);
        if (!cliente) {
          return {
            success: false,
            error: `No se encontró un cliente con email ${params.email}`,
          };
        }
        resultado = cliente;
      }
      // Búsqueda por nombre (puede retornar múltiples)
      else if (params.nombre) {
        const clientes = await backendClient.buscarClientePorNombre(params.nombre);
        if (clientes.length === 0) {
          return {
            success: false,
            error: `No se encontraron clientes con nombre similar a "${params.nombre}"`,
          };
        }
        resultado = clientes.length === 1 ? clientes[0] : clientes;
      }

      return {
        success: true,
        data: resultado,
        message: Array.isArray(resultado) 
          ? `Se encontraron ${resultado.length} clientes` 
          : 'Cliente encontrado exitosamente',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Error al buscar cliente',
      };
    }
  },
};

