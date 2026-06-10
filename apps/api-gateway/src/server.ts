import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cookie from '@fastify/cookie';
import type { PublisherRepository, ReceiptRepository } from '@crawlpay/persistence';
import { healthRoutes, type HealthInfo } from './routes/health';
import { receiptsRoutes } from './routes/receipts';
import { publishersRoutes } from './routes/publishers';
import { crawlersRoutes } from './routes/crawlers';
import { analyticsRoutes } from './routes/analytics';
import { authRoutes } from './routes/auth';
import { reputationRoutes } from './routes/reputation';
import type { AnalyticsService } from './services/analytics-service';
import type { AuthService } from './services/auth-service';
import type { ProbeService } from './services/probe-service';
import type { ReputationService } from './services/reputation-service';

export interface ServerDeps {
  receipts: ReceiptRepository;
  publishers: PublisherRepository;
  analytics: AnalyticsService;
  auth: AuthService;
  probe: ProbeService;
  reputation: ReputationService;
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

  // Cookie plugin powers session cookies on the auth routes.
  app.register(cookie, { hook: 'onRequest' });

  healthRoutes(app, deps.health);
  authRoutes(app, deps.auth);
  receiptsRoutes(app, deps.receipts);
  publishersRoutes(app, {
    publishers: deps.publishers,
    receipts: deps.receipts,
    auth: deps.auth,
    probe: deps.probe,
  });
  crawlersRoutes(app, deps.receipts);
  analyticsRoutes(app, deps.analytics);
  reputationRoutes(app, deps.reputation);

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'unhandled error');
    reply.code(500).send({ error: 'internal_error', message: err.message });
  });

  return app;
}
