import { Injectable, Logger } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { McpClientService } from '../mcp-client/mcp-client.service';

/**
 * Servicio orquestador que coordina Gemini AI y el MCP Server
 */
@Injectable()
export class ProcesadorService {
  private readonly logger = new Logger(ProcesadorService.name);

  constructor(
    private readonly geminiService: GeminiService,
    private readonly mcpClient: McpClientService,
  ) {}

  /**
   * Procesar una solicitud del usuario en lenguaje natural
   */
  async procesarSolicitud(mensaje: string): Promise<any> {
    try {
      this.logger.log(`\n${'='.repeat(80)}`);
      this.logger.log(`📨 NUEVA SOLICITUD DEL USUARIO`);
      this.logger.log(`   Mensaje: "${mensaje}"`);
      this.logger.log(`${'='.repeat(80)}\n`);

      // 1. Obtener herramientas disponibles del MCP Server
      this.logger.log('📋 Paso 1: Obteniendo herramientas del MCP Server...');
      const availableTools = await this.mcpClient.listTools();
      this.logger.log(`   ✅ ${availableTools.length} herramientas disponibles`);
      availableTools.forEach((tool, i) => {
        this.logger.debug(`      ${i + 1}. ${tool.name}: ${tool.description}`);
      });

      // 2. Enviar solicitud a Gemini con las herramientas
      this.logger.log('\n🤖 Paso 2: Consultando a Gemini AI...');
      const geminiResponse = await this.geminiService.processUserRequest(
        mensaje,
        availableTools
      );

      // 3. Verificar si Gemini quiere ejecutar herramientas
      if (geminiResponse.type === 'function_calls') {
        this.logger.log(`\n🔧 Paso 3: Gemini decidió ejecutar ${geminiResponse.functionCalls.length} herramienta(s)`);
        
        const functionResults = [];

        // Ejecutar cada herramienta secuencialmente
        for (const functionCall of geminiResponse.functionCalls) {
          this.logger.log(`\n   ⚙️  Ejecutando: ${functionCall.name}`);
          this.logger.debug(`      Argumentos: ${JSON.stringify(functionCall.args, null, 2)}`);

          try {
            const result = await this.mcpClient.callTool(
              functionCall.name,
              functionCall.args
            );

            this.logger.log(`      ✅ Resultado obtenido`);

            // Extraer el contenido del resultado
            let content = result.content;
            if (Array.isArray(content) && content.length > 0) {
              content = content[0].text;
            }

            // Parsear el JSON para enviar como objeto a Gemini
            let parsedContent = content;
            try {
              parsedContent = JSON.parse(content);
            } catch (e) {
              // Si no es JSON válido, dejar como está
              parsedContent = content;
            }

            functionResults.push({
              name: functionCall.name,
              response: parsedContent,
            });
          } catch (error: any) {
            this.logger.error(`      ❌ Error: ${error.message}`);
            functionResults.push({
              name: functionCall.name,
              response: JSON.stringify({
                success: false,
                error: error.message,
              }),
            });
          }
        }

        // 4. Enviar resultados de vuelta a Gemini para generar respuesta final
        this.logger.log(`\n💬 Paso 4: Generando respuesta final con Gemini...`);
        const finalResponse = await this.geminiService.continueConversation(
          geminiResponse.chat,
          functionResults
        );

        this.logger.log(`\n${'='.repeat(80)}`);
        this.logger.log(`✅ PROCESAMIENTO COMPLETADO`);
        this.logger.log(`${'='.repeat(80)}\n`);

        return {
          success: true,
          mensaje: finalResponse,
          herramientasEjecutadas: geminiResponse.functionCalls.map((fc: any) => fc.name),
          resultados: functionResults,
        };
      }

      // Si Gemini respondió directamente sin usar herramientas
      this.logger.log(`\n💬 Gemini respondió directamente sin usar herramientas`);
      this.logger.log(`\n${'='.repeat(80)}`);
      this.logger.log(`✅ PROCESAMIENTO COMPLETADO`);
      this.logger.log(`${'='.repeat(80)}\n`);

      return {
        success: true,
        mensaje: geminiResponse.text,
        herramientasEjecutadas: [],
      };
    } catch (error: any) {
      this.logger.error(`\n❌ ERROR EN EL PROCESAMIENTO: ${error.message}\n`);
      
      return {
        success: false,
        error: error.message,
        mensaje: 'Lo siento, ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.',
      };
    }
  }

  /**
   * Verificar el estado del sistema
   */
  async verificarEstado(): Promise<any> {
    const mcpDisponible = await this.mcpClient.healthCheck();
    
    return {
      mcpServer: mcpDisponible ? 'conectado' : 'desconectado',
      geminiAI: 'configurado',
      timestamp: new Date().toISOString(),
    };
  }
}

