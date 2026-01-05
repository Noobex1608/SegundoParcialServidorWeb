import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cliente } from '../clientes/entidades/cliente.entidad';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'better-sqlite3',
        database: 'data/clientes.db',
        entities: [Cliente],
        synchronize: true,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
