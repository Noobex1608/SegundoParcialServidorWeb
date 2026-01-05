import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesModule } from './clientes/clientes.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Módulo de base de datos
    DatabaseModule,
    
    // Módulo de Redis (para Circuit Breaker)
    RedisModule,
    
    // Módulo de webhooks (Global)
    WebhooksModule,
    
    // Módulo de clientes
    ClientesModule,
  ],
})
export class AppModule {}
