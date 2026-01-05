import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Crear aplicación HTTP REST
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS
  app.enableCors();
  
  // Habilitar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Iniciar servidor HTTP
  const puerto = process.env.PORT || 3003;
  await app.listen(puerto);
  
  console.log(`🚀 Microservicio Reservas iniciado en puerto ${puerto}`);
  console.log(`📡 API REST disponible en http://localhost:${puerto}/reservas`);
  console.log(`🔑 Idempotencia habilitada con Redis`);
}

bootstrap();
