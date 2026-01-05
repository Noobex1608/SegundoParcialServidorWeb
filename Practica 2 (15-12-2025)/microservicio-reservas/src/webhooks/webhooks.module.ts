import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookSecurityService } from './webhook-security.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { WebhookPublisherService } from './webhook-publisher.service';
import { IdempotenciaModule } from '../idempotencia/idempotencia.module';

/**
 * Módulo de webhooks con todos los servicios necesarios.
 * 
 * Servicios incluidos:
 * - WebhookSecurityService: Generación de firmas HMAC
 * - CircuitBreakerService: Protección contra servicios caídos
 * - WebhookPublisherService: Publicación de webhooks con retry
 */
@Global()
@Module({
  imports: [
    // HttpModule para hacer requests HTTP
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    // IdempotenciaModule para acceder a Redis (usado por CircuitBreaker)
    IdempotenciaModule,
  ],
  providers: [
    WebhookSecurityService,
    CircuitBreakerService,
    WebhookPublisherService,
  ],
  exports: [
    WebhookSecurityService,
    CircuitBreakerService,
    WebhookPublisherService,
  ],
})
export class WebhooksModule {}

