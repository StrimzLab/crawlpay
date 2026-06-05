import type { FastifyInstance } from 'fastify';
import type { Address } from '@crawlpay/types';
import {
  WINDOW_DAYS,
  type AnalyticsService,
  type AnalyticsWindow,
} from '../services/analytics-service';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function parseWindow(s: string | undefined): AnalyticsWindow | null {
  if (s === undefined || s === 'week') return 'week';
  if (s === 'day' || s === 'month') return s;
  return null;
}

export function analyticsRoutes(app: FastifyInstance, analytics: AnalyticsService): void {
  app.get<{ Params: { id: string }; Querystring: { window?: string } }>(
    '/analytics/publisher/:id',
    async (req, reply) => {
      const window = parseWindow(req.query.window);
      if (!window) {
        return reply.code(400).send({
          error: `window must be one of: ${Object.keys(WINDOW_DAYS).join(', ')}`,
        });
      }
      const analytic = await analytics.forPublisher(req.params.id, window);
      return reply.send({ analytics: analytic });
    },
  );

  app.get<{ Params: { wallet: string }; Querystring: { window?: string } }>(
    '/analytics/crawler/:wallet',
    async (req, reply) => {
      if (!ADDRESS_RE.test(req.params.wallet)) {
        return reply.code(400).send({ error: 'wallet must be a 0x-prefixed address' });
      }
      const window = parseWindow(req.query.window);
      if (!window) {
        return reply.code(400).send({
          error: `window must be one of: ${Object.keys(WINDOW_DAYS).join(', ')}`,
        });
      }
      const analytic = await analytics.forCrawler(req.params.wallet as Address, window);
      return reply.send({ analytics: analytic });
    },
  );
}
