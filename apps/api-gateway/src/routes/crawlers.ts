import type { FastifyInstance } from 'fastify';
import type { Address } from '@crawlpay/types';
import type { ReceiptRepository } from '@crawlpay/persistence';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function crawlersRoutes(app: FastifyInstance, receipts: ReceiptRepository): void {
  app.get<{
    Params: { wallet: string };
    Querystring: { limit?: string; offset?: string };
  }>('/crawlers/:wallet/receipts', async (req, reply) => {
    if (!ADDRESS_RE.test(req.params.wallet)) {
      return reply.code(400).send({ error: 'wallet must be a 0x-prefixed address' });
    }
    const wallet = req.params.wallet as Address;

    const limit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return reply.code(400).send({ error: `limit must be in [1, ${MAX_LIMIT}]` });
    }
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    if (!Number.isInteger(offset) || offset < 0) {
      return reply.code(400).send({ error: 'invalid offset' });
    }

    const [items, total] = await Promise.all([
      receipts.list({ crawlerWallet: wallet, limit, offset }),
      receipts.count({ crawlerWallet: wallet }),
    ]);
    return reply.send({
      crawler: { walletAddress: wallet },
      receipts: items,
      pagination: { total, limit, offset },
    });
  });
}
