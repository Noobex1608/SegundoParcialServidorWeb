import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class WebhookEmitterService {
  private readonly logger = new Logger(WebhookEmitterService.name);
  // Asegúrate de que esta variable exista en el .env de RESERVAS
  private readonly n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

  async emit(evento: string, payload: any): Promise<void> {
    if (!this.n8nWebhookUrl) {
        // Esto evita que falle si olvidaste la variable, solo avisa
        this.logger.warn('N8N_WEBHOOK_URL no está configurado'); 
        return;
    }

    try {
      await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evento,
          timestamp: new Date().toISOString(),
          data: payload,
        }),
      });
      this.logger.log(`Evento ${evento} emitido a n8n`);
    } catch (error) {
      this.logger.error(`Error emitiendo webhook: ${error.message}`);
    }
  }
}