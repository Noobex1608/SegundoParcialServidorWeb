import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RESERVAS_SERVICE',
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
      },
    ]),
  ],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}
