import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { Reserva } from './entidades/reserva.entidad';
import { IdempotenciaModule } from '../idempotencia/idempotencia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reserva]),
    IdempotenciaModule,
    // Importar ClientsModule para tener acceso a CLIENTES_SERVICE
    ClientsModule.register([
      {
        name: 'CLIENTES_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672'],
          queue: process.env.RABBITMQ_QUEUE_VALIDAR_CLIENTE || 'cola_validar_cliente',
          queueOptions: {
            durable: true,
          },
          // ✅ PRODUCTORES (clientes que envían) NO usan noAck ni prefetchCount
          // Configuración de reconexión automática
          socketOptions: {
            heartbeatIntervalInSeconds: 60, // Heartbeat cada 60s para detectar conexiones rotas
            reconnectTimeInSeconds: 5,      // Reintentar reconexión cada 5s si falla
          },
        },
      },
    ]),
  ],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
