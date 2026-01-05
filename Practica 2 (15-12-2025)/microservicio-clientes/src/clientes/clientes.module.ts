import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';
import { Cliente } from './entidades/cliente.entidad';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cliente]),
  ],
  controllers: [ClientesController],
  providers: [ClientesService],
  exports: [ClientesService],
})
export class ClientesModule {}
