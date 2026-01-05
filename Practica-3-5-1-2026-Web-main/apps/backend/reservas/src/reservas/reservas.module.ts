import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';
import { Reserva } from './entidades/reserva.entidad';
import { IdempotenciaModule } from '../idempotencia/idempotencia.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reserva]),
    IdempotenciaModule,
    HttpModule, // Para hacer llamadas HTTP al microservicio de clientes
  ],
  controllers: [ReservasController],
  providers: [ReservasService],
  exports: [ReservasService],
})
export class ReservasModule {}
