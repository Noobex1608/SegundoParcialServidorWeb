import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClientesController } from './clientes.controller';
import { ClientesService } from './clientes.service';

@Module({
  imports: [HttpModule],
  controllers: [ClientesController],
  providers: [ClientesService],
})
export class ClientesModule {}
