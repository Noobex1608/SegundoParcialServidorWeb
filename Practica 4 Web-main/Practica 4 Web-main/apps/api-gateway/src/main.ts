import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para desarrollo
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Habilitar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Prefijo global para todas las rutas
  app.setGlobalPrefix('api');

  const puerto = process.env.PORT || 3000;
  await app.listen(puerto);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('🌐 API Gateway + Gemini AI + MCP iniciado exitosamente');
  console.log(`📍 URL: http://localhost:${puerto}/api`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('🤖 Endpoint MCP + Gemini (NUEVO):');
  console.log('   • POST   /api/procesador (Procesar lenguaje natural)');
  console.log('   • GET    /api/procesador/estado');
  console.log('');
  console.log('📌 Endpoints REST tradicionales:');
  console.log('   • GET    /api/clientes');
  console.log('   • POST   /api/clientes');
  console.log('   • GET    /api/clientes/:id');
  console.log('   • PATCH  /api/clientes/:id');
  console.log('   • DELETE /api/clientes/:id');
  console.log('   • GET    /api/reservas');
  console.log('   • POST   /api/reservas');
  console.log('   • GET    /api/reservas/:id');
  console.log('   • PATCH  /api/reservas/:id/cancelar');
  console.log('═══════════════════════════════════════════════════════');
}

bootstrap();
