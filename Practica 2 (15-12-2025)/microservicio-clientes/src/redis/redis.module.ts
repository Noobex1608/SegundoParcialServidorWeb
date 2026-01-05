import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

/**
 * Módulo Redis para el microservicio de clientes.
 * Usado por CircuitBreaker para persistir estados.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const cliente = createClient({
          socket: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: configService.get('REDIS_PORT', 6379),
          },
        });

        cliente.on('error', (error) => {
          console.error('❌ Error de conexión a Redis:', error);
        });

        cliente.on('connect', () => {
          console.log('✅ Conectado a Redis (microservicio-clientes)');
        });

        await cliente.connect();
        return cliente;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}

