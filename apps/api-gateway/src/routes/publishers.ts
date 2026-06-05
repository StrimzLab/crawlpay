import type { FastifyInstance } from 'fastify';
import type { Address, Network } from '@crawlpay/types';
import { atomicUsdc } from '@crawlpay/types';
import {
  PublisherAlreadyExistsError,
  type CreatePublisherInput,
  type PublisherRepository,
  type ReceiptRepository,
} from '@crawlpay/persistence';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

interface ListQuery {
  active?: string;
  network?: string;
  limit?: string;
  offset?: string;
}

interface CreateBody {
  id?: unknown;
  domain?: unknown;
  walletAddress?: unknown;
  network?: unknown;
  defaultPriceAtomic?: unknown;
  erc8004AgentId?: unknown;
  description?: unknown;
  minReputationScore?: unknown;
  robotsTxtAware?: unknown;
  active?: unknown;
}

function isAddress(v: unknown): v is Address {
  return typeof v === 'string' && ADDRESS_RE.test(v);
}

function asPositiveInt(s: string | undefined, fallback: number, max?: number): number | null {
  if (s === undefined) return fallback;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) return null;
  if (max !== undefined && n > max) return null;
  return n;
}

export function publishersRoutes(
  app: FastifyInstance,
  publishers: PublisherRepository,
  receipts: ReceiptRepository,
): void {
  app.get<{ Querystring: ListQuery }>('/publishers', async (req, reply) => {
    const filter: Parameters<PublisherRepository['list']>[0] = {};
    if (req.query.active !== undefined) {
      filter.active = req.query.active === 'true' || req.query.active === '1';
    }
    if (req.query.network !== undefined) filter.network = req.query.network as Network;

    const limit = asPositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    if (limit === null) return reply.code(400).send({ error: `limit must be in [0, ${MAX_LIMIT}]` });
    const offset = asPositiveInt(req.query.offset, 0);
    if (offset === null) return reply.code(400).send({ error: 'invalid offset' });
    filter.limit = limit;
    filter.offset = offset;

    const [items, total] = await Promise.all([
      publishers.list(filter),
      publishers.count({ ...filter, limit: undefined, offset: undefined }),
    ]);
    return reply.send({ publishers: items, pagination: { total, limit, offset } });
  });

  // v0: no auth. v1 should gate this behind an API key.
  app.post('/publishers', async (req, reply) => {
    const body = (req.body ?? {}) as CreateBody;

    if (typeof body.id !== 'string' || body.id.length === 0) {
      return reply.code(400).send({ error: 'id required (non-empty string)' });
    }
    if (typeof body.domain !== 'string' || body.domain.length === 0) {
      return reply.code(400).send({ error: 'domain required (non-empty string)' });
    }
    if (!isAddress(body.walletAddress)) {
      return reply.code(400).send({ error: 'walletAddress required (0x-prefixed address)' });
    }
    if (body.network !== undefined && body.network !== 'arcTestnet') {
      return reply.code(400).send({ error: 'network must be "arcTestnet"' });
    }

    const input: CreatePublisherInput = {
      id: body.id,
      domain: body.domain,
      walletAddress: body.walletAddress,
      network: (body.network as Network | undefined) ?? 'arcTestnet',
    };
    if (typeof body.defaultPriceAtomic === 'string' || typeof body.defaultPriceAtomic === 'number') {
      try {
        input.defaultPriceAtomic = atomicUsdc(BigInt(body.defaultPriceAtomic));
      } catch (err) {
        return reply.code(400).send({ error: `invalid defaultPriceAtomic: ${(err as Error).message}` });
      }
    }
    if (typeof body.erc8004AgentId === 'string') input.erc8004AgentId = body.erc8004AgentId;
    if (typeof body.description === 'string') input.description = body.description;
    if (typeof body.minReputationScore === 'number') input.minReputationScore = body.minReputationScore;
    if (typeof body.robotsTxtAware === 'boolean') input.robotsTxtAware = body.robotsTxtAware;
    if (typeof body.active === 'boolean') input.active = body.active;

    try {
      const created = await publishers.create(input);
      return reply.code(201).send({ publisher: created });
    } catch (err) {
      if (err instanceof PublisherAlreadyExistsError) {
        return reply.code(409).send({ error: err.message, field: err.field, value: err.value });
      }
      throw err;
    }
  });

  app.get<{ Params: { id: string } }>('/publishers/:id', async (req, reply) => {
    const publisher = await publishers.get(req.params.id);
    if (!publisher) return reply.code(404).send({ error: 'publisher not found' });
    return reply.send({ publisher });
  });

  app.get<{ Params: { id: string }; Querystring: { limit?: string; offset?: string } }>(
    '/publishers/:id/receipts',
    async (req, reply) => {
      const limit = asPositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      if (limit === null) return reply.code(400).send({ error: `limit must be in [0, ${MAX_LIMIT}]` });
      const offset = asPositiveInt(req.query.offset, 0);
      if (offset === null) return reply.code(400).send({ error: 'invalid offset' });

      const publisher = await publishers.get(req.params.id);
      if (!publisher) return reply.code(404).send({ error: 'publisher not found' });

      const [items, total] = await Promise.all([
        receipts.list({ publisherId: req.params.id, limit, offset }),
        receipts.count({ publisherId: req.params.id }),
      ]);
      return reply.send({
        publisher: { id: publisher.id, domain: publisher.domain },
        receipts: items,
        pagination: { total, limit, offset },
      });
    },
  );
}
