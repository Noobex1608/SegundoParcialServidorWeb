import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { McpClientService } from './mcp-client.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 15000,
      maxRedirects: 5,
    }),
  ],
  providers: [McpClientService],
  exports: [McpClientService],
})
export class McpClientModule {}

