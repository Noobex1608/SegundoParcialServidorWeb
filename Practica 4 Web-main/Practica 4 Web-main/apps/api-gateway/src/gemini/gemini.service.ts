import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Servicio para interactuar con Gemini AI
 */
@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      this.logger.error('❌ GEMINI_API_KEY no está configurada en las variables de entorno');
      throw new Error('GEMINI_API_KEY no configurada');
    }

    // Modelos válidos: gemini-pro, gemini-1.5-flash-latest, gemini-2.5-flash
    this.modelName = process.env.GEMINI_MODEL || 'gemini-pro';

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95,
        topK: 40,
      },
    });

    this.logger.log(`✅ Gemini AI inicializado correctamente con modelo: ${this.modelName}`);
  }

  /**
   * Convertir herramientas MCP a formato de Function Calling de Gemini
   */
  private convertToolsToGeminiFormat(mcpTools: any[]): any[] {
    return mcpTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: this.convertJsonSchemaToGemini(tool.inputSchema),
    }));
  }

  /**
   * Convertir JSON Schema a formato de Gemini
   */
  private convertJsonSchemaToGemini(schema: any): any {
    const converted: any = {
      type: 'object',
      properties: {},
      required: schema.required || [],
    };

    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        const prop: any = value;
        converted.properties[key] = {
          type: this.mapJsonTypeToGemini(prop.type),
          description: prop.description || '',
        };

        if (prop.default !== undefined) {
          converted.properties[key].default = prop.default;
        }
      }
    }

    return converted;
  }

  /**
   * Mapear tipos de JSON Schema a tipos de Gemini
   */
  private mapJsonTypeToGemini(jsonType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'integer': 'integer',
      'boolean': 'boolean',
      'array': 'array',
      'object': 'object',
    };

    return typeMap[jsonType] || 'string';
  }

  /**
   * Procesar una solicitud del usuario con Gemini
   */
  async processUserRequest(userMessage: string, availableTools: any[]): Promise<any> {
    try {
      this.logger.log(`🤖 Procesando solicitud con Gemini AI...`);
      this.logger.debug(`   Mensaje: "${userMessage}"`);
      this.logger.debug(`   Herramientas disponibles: ${availableTools.length}`);

      // Convertir herramientas a formato Gemini
      const geminiTools = this.convertToolsToGeminiFormat(availableTools);

      // Crear el chat con las herramientas
      const chat = this.model.startChat({
        tools: [{ functionDeclarations: geminiTools }],
        history: [],
      });

      // Enviar el mensaje del usuario
      const result = await chat.sendMessage(userMessage);
      const response = result.response;

      this.logger.log(`✅ Respuesta recibida de Gemini`);

      // Verificar si Gemini quiere llamar a alguna función
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        this.logger.log(`🔧 Gemini decidió ejecutar ${functionCalls.length} herramienta(s)`);
        
        return {
          type: 'function_calls',
          functionCalls: functionCalls.map((fc: any) => ({
            name: fc.name,
            args: fc.args,
          })),
          chat, // Retornar el chat para continuar la conversación
        };
      }

      // Si no hay function calls, retornar la respuesta de texto
      const textResponse = response.text();
      this.logger.log(`💬 Gemini respondió con texto: "${textResponse.substring(0, 100)}..."`);

      return {
        type: 'text',
        text: textResponse,
        chat,
      };
    } catch (error: any) {
      this.logger.error(`❌ Error al procesar con Gemini: ${error.message}`);
      throw new Error(`Error de Gemini AI: ${error.message}`);
    }
  }

  /**
   * Continuar la conversación después de ejecutar herramientas
   */
  async continueConversation(chat: any, functionResults: any[]): Promise<string> {
    try {
      this.logger.log(`🔄 Continuando conversación con resultados de herramientas...`);

      // Enviar los resultados de las funciones de vuelta a Gemini
      const result = await chat.sendMessage(
        functionResults.map(fr => ({
          functionResponse: {
            name: fr.name,
            response: fr.response,
          },
        }))
      );

      const finalResponse = result.response.text();
      this.logger.log(`✅ Respuesta final de Gemini generada`);

      return finalResponse;
    } catch (error: any) {
      this.logger.error(`❌ Error al continuar conversación: ${error.message}`);
      throw new Error(`Error al continuar conversación: ${error.message}`);
    }
  }
}

