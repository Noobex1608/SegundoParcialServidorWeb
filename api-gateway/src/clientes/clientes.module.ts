import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'CLIENTES_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://admin:admin123@rabbitmq:5672'],
          queue: 'cola_clientes',
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
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
