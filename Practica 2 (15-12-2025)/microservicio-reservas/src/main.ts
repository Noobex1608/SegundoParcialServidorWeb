import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  // Crear aplicación híbrida: HTTP + RabbitMQ consumer
  const app = await NestFactory.create(AppModule);
  
  // Configurar como consumidor de RabbitMQ (para recibir mensajes del Gateway)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672'],
      queue: 'cola_reservas',
      queueOptions: {
        durable: true,
      },
      socketOptions: {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
      },
    },
  });
  
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
  
  // Iniciar todos los microservicios (RabbitMQ)
  await app.startAllMicroservices();
  
  // Iniciar servidor HTTP
  const puerto = process.env.PORT || 3002;
  await app.listen(puerto);
  
  console.log(`🚀 Microservicio Reservas iniciado en puerto ${puerto}`);
  console.log(`📬 Escuchando cola RabbitMQ: cola_reservas`);
  console.log(`📤 También envía mensajes a Clientes vía RabbitMQ`);
  console.log(`🔑 Idempotencia habilitada con Redis`);
}

bootstrap();
