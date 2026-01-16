import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reserva } from '../reservas/entidades/reserva.entidad';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'better-sqlite3',
        database: 'data/reservas.db',
        entities: [Reserva],
        synchronize: true,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
