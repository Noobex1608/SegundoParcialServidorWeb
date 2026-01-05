import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReservasModule } from './reservas/reservas.module';
import { DatabaseModule } from './database/database.module';
import { IdempotenciaModule } from './idempotencia/idempotencia.module';

@Module({
  imports: [
    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Módulo de base de datos
    DatabaseModule,
    
    // Módulo de idempotencia (Redis)
    IdempotenciaModule,
    
    // Módulo de reservas (incluye configuración de ClientsModule)
    ReservasModule,
  ],
})
export class AppModule {}
