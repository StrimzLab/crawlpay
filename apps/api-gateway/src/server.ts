import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import type { PublisherRepository, ReceiptRepository } from '@crawlpay/persistence';
import { healthRoutes, type HealthInfo } from './routes/health';
import { receiptsRoutes } from './routes/receipts';
import { publishersRoutes } from './routes/publishers';
import { crawlersRoutes } from './routes/crawlers';
import { analyticsRoutes } from './routes/analytics';
import type { AnalyticsService } from './services/analytics-service';

export interface ServerDeps {
  receipts: ReceiptRepository;
  publishers: PublisherRepository;
  analytics: AnalyticsService;
  health: HealthInfo;
  logger?: FastifyServerOptions['logger'];
}

/**
 * Build the api-gateway Fastify app without starting it. Routes are mounted
 * here so tests can `app.inject()` against the same instance configuration
 * the production process uses.
 */
export function buildServer(deps: ServerDeps): FastifyInstance {
  const app = Fastify({ logger: deps.logger ?? false });

  healthRoutes(app, deps.health);
  receiptsRoutes(app, deps.receipts);
  publishersRoutes(app, deps.publishers, deps.receipts);
  crawlersRoutes(app, deps.receipts);
  analyticsRoutes(app, deps.analytics);

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'unhandled error');
    reply.code(500).send({ error: 'internal_error', message: err.message });
  });

  return app;
}
