import cors from 'cors';
import express, { Request, Response } from 'express';
import { ToolRegistry } from './tools/registry';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar el registro de herramientas
const toolRegistry = new ToolRegistry();

/**
 * Interfaz JSON-RPC 2.0 Request
 */
interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: string | number;
}

/**
 * Interfaz JSON-RPC 2.0 Response
 */
interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string | number | null;
}

/**
 * Códigos de error JSON-RPC 2.0
 */
const JsonRpcErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

/**
 * Endpoint principal JSON-RPC 2.0
 */
app.post('/rpc', async (req: Request, res: Response) => {
  const startTime = Date.now();
  let request: JsonRpcRequest | undefined;

  try {
    request = req.body;

    // Validar estructura JSON-RPC 2.0
    if (!request || request.jsonrpc !== '2.0') {
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: JsonRpcErrorCodes.INVALID_REQUEST,
          message: 'Solicitud JSON-RPC inválida',
        },
        id: null,
      } as JsonRpcResponse);
    }

    console.log(`\n📥 JSON-RPC Request [${request.id}]: ${request.method}`);
    console.log(`   Params:`, JSON.stringify(request.params, null, 2));

    // Manejar métodos del protocolo MCP
    switch (request.method) {
      case 'tools/list':
        // Listar todas las herramientas disponibles
        const tools = toolRegistry.getAllTools();
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          result: { tools },
          id: request.id,
        };
        console.log(`✅ Retornando ${tools.length} herramientas`);
        return res.json(response);

      case 'tools/call':
        // Ejecutar una herramienta específica
        const { name, arguments: toolArgs } = request.params || {};

        if (!name) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: JsonRpcErrorCodes.INVALID_PARAMS,
              message: 'Falta el parámetro "name" de la herramienta',
            },
            id: request.id,
          } as JsonRpcResponse);
        }

        if (!toolRegistry.hasTool(name)) {
          return res.status(404).json({
            jsonrpc: '2.0',
            error: {
              code: JsonRpcErrorCodes.METHOD_NOT_FOUND,
              message: `Herramienta no encontrada: ${name}`,
              data: {
                availableTools: toolRegistry.getAllTools().map(t => t.name),
              },
            },
            id: request.id,
          } as JsonRpcResponse);
        }

        try {
          const result = await toolRegistry.executeTool(name, toolArgs || {});
          const duration = Date.now() - startTime;
          
          console.log(`✅ Tool ejecutada exitosamente en ${duration}ms`);
          
          return res.json({
            jsonrpc: '2.0',
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
                },
              ],
              isError: !result.success,
            },
            id: request.id,
          } as JsonRpcResponse);
        } catch (error: any) {
          console.error(`❌ Error ejecutando tool: ${error.message}`);
          return res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: JsonRpcErrorCodes.INTERNAL_ERROR,
              message: error.message || 'Error interno al ejecutar la herramienta',
              data: { stack: error.stack },
            },
            id: request.id,
          } as JsonRpcResponse);
        }

      default:
        return res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: JsonRpcErrorCodes.METHOD_NOT_FOUND,
            message: `Método no encontrado: ${request.method}`,
            data: {
              availableMethods: ['tools/list', 'tools/call'],
            },
          },
          id: request.id,
        } as JsonRpcResponse);
    }
  } catch (error: any) {
    console.error(`❌ Error procesando solicitud JSON-RPC:`, error);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: JsonRpcErrorCodes.INTERNAL_ERROR,
        message: 'Error interno del servidor',
        data: { message: error.message },
      },
      id: request?.id || null,
    } as JsonRpcResponse);
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'MCP Server - Sistema de Reservas',
    timestamp: new Date().toISOString(),
    tools: toolRegistry.getAllTools().map(t => t.name),
  });
});

/**
 * Endpoint para listar herramientas (alternativa REST)
 */
app.get('/tools', (req: Request, res: Response) => {
  const tools = toolRegistry.getAllTools();
  res.json({
    count: tools.length,
    tools,
  });
});

/**
 * Iniciar servidor
 */
app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`   MCP Server - Sistema de Reservas`);
  console.log('   ========================================');
  console.log(`   🌐 Servidor escuchando en puerto ${PORT}`);
  console.log(`   📡 JSON-RPC endpoint: http://localhost:${PORT}/rpc`);
  console.log(`   ❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`   🔧 Tools disponibles: ${toolRegistry.getAllTools().length}`);
  console.log('   ========================================\n');
  
  // Listar herramientas registradas
  toolRegistry.getAllTools().forEach((tool, index) => {
    console.log(`   ${index + 1}. ${tool.name} - ${tool.description}`);
  });
  console.log('\n');
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

