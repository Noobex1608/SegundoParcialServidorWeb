import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/**
 * Cliente para comunicarse con el MCP Server mediante JSON-RPC 2.0
 */
@Injectable()
export class McpClientService {
  private readonly logger = new Logger(McpClientService.name);
  private readonly mcpServerUrl: string;
  private requestIdCounter = 0;

  constructor(private readonly httpService: HttpService) {
    const host = process.env.MCP_SERVER_HOST || 'localhost';
    const port = process.env.MCP_SERVER_PORT || '3001';
    this.mcpServerUrl = `http://${host}:${port}/rpc`;
    this.logger.log(`🔗 MCP Client configurado: ${this.mcpServerUrl}`);
  }

  /**
   * Generar un ID único para cada request JSON-RPC
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${++this.requestIdCounter}`;
  }

  /**
   * Listar todas las herramientas disponibles en el MCP Server
   */
  async listTools(): Promise<any[]> {
    try {
      this.logger.debug('📋 Solicitando lista de herramientas al MCP Server...');

      const response = await firstValueFrom(
        this.httpService.post(this.mcpServerUrl, {
          jsonrpc: '2.0',
          method: 'tools/list',
          id: this.generateRequestId(),
        })
      );

      if (response.data.error) {
        throw new Error(`Error del MCP Server: ${response.data.error.message}`);
      }

      const tools = response.data.result?.tools || [];
      this.logger.log(`✅ Obtenidas ${tools.length} herramientas del MCP Server`);
      
      return tools;
    } catch (error: any) {
      this.logger.error(`❌ Error al listar herramientas: ${error.message}`);
      throw new Error(`No se pudo conectar con el MCP Server: ${error.message}`);
    }
  }

  /**
   * Ejecutar una herramienta específica en el MCP Server
   */
  async callTool(toolName: string, toolArguments: any): Promise<any> {
    try {
      this.logger.log(`🔧 Ejecutando herramienta: ${toolName}`);
      this.logger.debug(`   Argumentos: ${JSON.stringify(toolArguments)}`);

      const response = await firstValueFrom(
        this.httpService.post(this.mcpServerUrl, {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: toolArguments,
          },
          id: this.generateRequestId(),
        })
      );

      if (response.data.error) {
        this.logger.error(`❌ Error del MCP Server: ${response.data.error.message}`);
        throw new Error(response.data.error.message);
      }

      const result = response.data.result;
      this.logger.log(`✅ Herramienta ${toolName} ejecutada exitosamente`);

      return result;
    } catch (error: any) {
      this.logger.error(`❌ Error al ejecutar herramienta ${toolName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verificar si el MCP Server está disponible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const healthUrl = this.mcpServerUrl.replace('/rpc', '/health');
      const response = await firstValueFrom(
        this.httpService.get(healthUrl)
      );
      return response.data.status === 'ok';
    } catch (error) {
      return false;
    }
  }
}

