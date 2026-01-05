import { BackendClient } from '../services/backend-client';
import { buscarClienteTool } from './buscar-cliente.tool';
import { validarDisponibilidadTool } from './validar-disponibilidad.tool';
import { crearReservaTool } from './crear-reserva.tool';

/**
 * Registro central de todas las herramientas (Tools) disponibles en el MCP Server
 */
export class ToolRegistry {
  private backendClient: BackendClient;
  private tools: Map<string, any>;

  constructor() {
    this.backendClient = new BackendClient();
    this.tools = new Map();

    // Registrar todas las herramientas
    this.registerTool(buscarClienteTool);
    this.registerTool(validarDisponibilidadTool);
    this.registerTool(crearReservaTool);
  }

  /**
   * Registrar una herramienta en el registro
   */
  private registerTool(tool: any) {
    this.tools.set(tool.name, tool);
    console.log(`✅ Tool registrada: ${tool.name}`);
  }

  /**
   * Obtener todas las herramientas disponibles (para enviar a Gemini)
   */
  getAllTools() {
    const toolsList = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));

    return toolsList;
  }

  /**
   * Ejecutar una herramienta específica
   */
  async executeTool(toolName: string, params: any) {
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Tool no encontrada: ${toolName}`);
    }

    console.log(`🔧 Ejecutando tool: ${toolName}`, params);
    const result = await tool.execute(params, this.backendClient);
    console.log(`✅ Resultado de ${toolName}:`, result);

    return result;
  }

  /**
   * Verificar si una herramienta existe
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Obtener información de una herramienta específica
   */
  getTool(toolName: string) {
    return this.tools.get(toolName);
  }
}

