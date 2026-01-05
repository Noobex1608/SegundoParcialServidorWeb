import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  // Crear aplicación híbrida (HTTP + RabbitMQ)
  const app = await NestFactory.create(AppModule);
  
  // Habilitar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configurar microservicio RabbitMQ - Cola general de clientes
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672'],
      queue: process.env.RABBITMQ_QUEUE_CLIENTES || 'cola_clientes',
      queueOptions: {
        durable: true,
      },
      socketOptions: {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
      },
    },
  });

  // Configurar segunda cola para validaciones desde Reservas
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672'],
      queue: 'cola_validar_cliente',
      queueOptions: {
        durable: true,
      },
      socketOptions: {
        heartbeatIntervalInSeconds: 60,
        reconnectTimeInSeconds: 5,
      },
    },
  });

  // Iniciar todos los microservicios conectados
  await app.startAllMicroservices();
  
  // Iniciar servidor HTTP
  const puerto = process.env.PORT || 3001;
  await app.listen(puerto);
  
  console.log(`🚀 Microservicio Clientes iniciado en puerto ${puerto}`);
  console.log(`📬 Escuchando colas RabbitMQ:`);
  console.log(`   - cola_clientes (API Gateway)`);
  console.log(`   - cola_validar_cliente (Validaciones desde Reservas)`);
}

bootstrap();
