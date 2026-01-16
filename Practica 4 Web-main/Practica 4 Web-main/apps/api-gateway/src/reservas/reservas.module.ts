import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReservasController } from './reservas.controller';
import { ReservasService } from './reservas.service';

@Module({
  imports: [HttpModule],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}
