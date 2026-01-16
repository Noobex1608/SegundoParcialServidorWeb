import { Module } from '@nestjs/common';
import { ProcesadorController } from './procesador.controller';
import { ProcesadorService } from './procesador.service';
import { GeminiModule } from '../gemini/gemini.module';
import { McpClientModule } from '../mcp-client/mcp-client.module';

@Module({
  imports: [GeminiModule, McpClientModule],
  controllers: [ProcesadorController],
  providers: [ProcesadorService],
})
export class ProcesadorModule {}

