import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ClientesModule } from './clientes/clientes.module';
import { ReservasModule } from './reservas/reservas.module';

@Module({
  imports: [
    // Configuración de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Módulo HTTP para hacer peticiones a microservicios
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    
    // Módulos de dominio
    ClientesModule,
    ReservasModule,
  ],
})
export class AppModule {}
