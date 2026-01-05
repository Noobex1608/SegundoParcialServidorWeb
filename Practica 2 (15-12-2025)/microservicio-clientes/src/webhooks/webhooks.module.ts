import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookSecurityService } from './webhook-security.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { WebhookPublisherService } from './webhook-publisher.service';
import { RedisModule } from '../redis/redis.module';

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
    // RedisModule para acceder a Redis (usado por CircuitBreaker)
    RedisModule,
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

