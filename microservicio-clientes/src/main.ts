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

  // Configurar microservicio RabbitMQ
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672'],
      queue: process.env.RABBITMQ_QUEUE_VALIDAR_CLIENTE || 'cola_validar_cliente',
      queueOptions: {
        durable: true,
      },
      // Configuración para procesamiento confiable
      noAck: false, // Requiere ACK manual
      prefetchCount: 1, // Procesar un mensaje a la vez
    },
  });

  // Iniciar todos los microservicios conectados
  await app.startAllMicroservices();
  
  // Iniciar servidor HTTP
  const puerto = process.env.PORT || 3001;
  await app.listen(puerto);
  
  console.log(`🚀 Microservicio Clientes iniciado en puerto ${puerto}`);
  console.log(`📬 Escuchando cola RabbitMQ: ${process.env.RABBITMQ_QUEUE_VALIDAR_CLIENTE}`);
}

bootstrap();
