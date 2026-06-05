import type { FastifyInstance } from 'fastify';
import type { Address, CrawlPayReceipt, Hex } from '@crawlpay/types';
import { verifyReceipt } from '@crawlpay/receipt-signer';
import type { ReceiptFilter, ReceiptRepository } from '@crawlpay/persistence';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const NONCE_RE = /^0x[0-9a-fA-F]{64}$/;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface ListQuery {
  publisher_id?: string;
  publisher_wallet?: string;
  crawler_wallet?: string;
  from?: string;
  to?: string;
  limit?: string;
  offset?: string;
}

interface VerifyBody {
  receipt?: unknown;
  expectedSigner?: unknown;
}

function parseFilter(q: ListQuery): { filter: ReceiptFilter; error?: string } {
  const filter: ReceiptFilter = {};
  if (q.publisher_id) filter.publisherId = q.publisher_id;
  if (q.publisher_wallet) {
    if (!ADDRESS_RE.test(q.publisher_wallet)) return { filter, error: 'invalid publisher_wallet' };
    filter.publisherWallet = q.publisher_wallet as Address;
  }
  if (q.crawler_wallet) {
    if (!ADDRESS_RE.test(q.crawler_wallet)) return { filter, error: 'invalid crawler_wallet' };
    filter.crawlerWallet = q.crawler_wallet as Address;
  }
  if (q.from) {
    const n = Number(q.from);
    if (!Number.isInteger(n) || n < 0) return { filter, error: 'invalid from' };
    filter.fromTimestamp = n;
  }
  if (q.to) {
    const n = Number(q.to);
    if (!Number.isInteger(n) || n < 0) return { filter, error: 'invalid to' };
    filter.toTimestamp = n;
  }
  const limit = q.limit ? Number(q.limit) : DEFAULT_LIMIT;
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return { filter, error: `limit must be in [1, ${MAX_LIMIT}]` };
  }
  filter.limit = limit;
  const offset = q.offset ? Number(q.offset) : 0;
  if (!Number.isInteger(offset) || offset < 0) return { filter, error: 'invalid offset' };
  filter.offset = offset;
  return { filter };
}

export function receiptsRoutes(app: FastifyInstance, receipts: ReceiptRepository): void {
  app.get<{ Querystring: ListQuery }>('/receipts', async (req, reply) => {
    const { filter, error } = parseFilter(req.query);
    if (error) return reply.code(400).send({ error });

    const [items, total] = await Promise.all([
      receipts.list(filter),
      receipts.count({ ...filter, limit: undefined, offset: undefined }),
    ]);
    return reply.send({
      receipts: items,
      pagination: {
        total,
        limit: filter.limit ?? DEFAULT_LIMIT,
        offset: filter.offset ?? 0,
      },
    });
  });

  app.get<{ Params: { nonce: string } }>('/receipts/:nonce', async (req, reply) => {
    if (!NONCE_RE.test(req.params.nonce)) {
      return reply.code(400).send({ error: 'nonce must be a 0x-prefixed 32-byte hex string' });
    }
    const receipt = await receipts.getByNonce(req.params.nonce as Hex);
    if (!receipt) return reply.code(404).send({ error: 'receipt not found' });
    return reply.send({ receipt });
  });

  app.post('/receipts/verify', async (req, reply) => {
    const body = (req.body ?? {}) as VerifyBody;
    if (!body.receipt || typeof body.receipt !== 'object') {
      return reply.code(400).send({ error: 'receipt required (object)' });
    }
    const expectedSigner =
      typeof body.expectedSigner === 'string' && ADDRESS_RE.test(body.expectedSigner)
        ? (body.expectedSigner as Address)
        : undefined;
    const result = await verifyReceipt(body.receipt as CrawlPayReceipt, expectedSigner);
    return reply.send(result);
  });
}
