import type { FastifyInstance } from 'fastify';
import type { Address, Network } from '@crawlpay/types';
import { atomicUsdc } from '@crawlpay/types';
import {
  PublisherAlreadyExistsError,
  type CreatePublisherInput,
  type PublisherRepository,
  type ReceiptRepository,
} from '@crawlpay/persistence';
import type { AuthService } from '../services/auth-service';
import type { ProbeService } from '../services/probe-service';
import { requireAuth } from '../middleware/require-auth';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

interface ListQuery {
  active?: string;
  network?: string;
  limit?: string;
  offset?: string;
}

interface CreateBody {
  /** Optional client-supplied id; if omitted we derive from domain. */
  id?: unknown;
  /** Domain the publisher wants to monetize. */
  domain?: unknown;
  /** Optional override; otherwise we use the session's address. */
  walletAddress?: unknown;
  network?: unknown;
  defaultPriceAtomic?: unknown;
  description?: unknown;
}

export interface PublishersRoutesDeps {
  publishers: PublisherRepository;
  receipts: ReceiptRepository;
  auth: AuthService;
  probe: ProbeService;
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

/**
 * Slugify a domain into a stable publisher id. Strips `www.`, takes the
 * leading label, and camel-cases hyphenated parts:
 *   technotes.example.com → pub_technotes
 *   foo-bar.io           → pub_fooBar
 *   www.crawlers.dev     → pub_crawlers
 */
function makePublisherId(domain: string): string {
  const main = domain.toLowerCase().replace(/^www\./, '').split('.')[0] ?? 'site';
  const parts = main.split(/[-_]/).filter(Boolean);
  const camel = parts
    .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join('');
  const clean = camel.replace(/[^a-zA-Z0-9]/g, '').slice(0, 32) || 'site';
  return `pub_${clean}`;
}

export function publishersRoutes(app: FastifyInstance, deps: PublishersRoutesDeps): void {
  const { publishers, receipts, auth, probe } = deps;

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

  /**
   * Create a publisher. Requires a signed-in session — the session's address
   * becomes the publisher's `walletAddress` (where Circle Gateway routes
   * settled funds).
   *
   * Receipt-signing keys are NOT generated here; the dashboard generates
   * them client-side via viem so the secret never touches the server.
   */
  app.post(
    '/publishers',
    { preHandler: requireAuth(auth) },
    async (req, reply) => {
      const sessionAddress = req.authAddress!;
      const body = (req.body ?? {}) as CreateBody;

      if (typeof body.domain !== 'string' || !DOMAIN_RE.test(body.domain.trim())) {
        return reply.code(400).send({ error: 'invalid_domain', detail: 'expected e.g. example.com' });
      }

      // Wallet defaults to the session's address. If the client supplied one,
      // it must match — we never let a logged-in user create a publisher
      // record pointing at someone else's wallet.
      if (body.walletAddress !== undefined) {
        if (!isAddress(body.walletAddress)) {
          return reply.code(400).send({ error: 'invalid_wallet_address' });
        }
        if (body.walletAddress.toLowerCase() !== sessionAddress.toLowerCase()) {
          return reply.code(403).send({ error: 'wallet_mismatch', detail: 'walletAddress must match your signed-in address' });
        }
      }

      const domain = body.domain.trim().toLowerCase();
      const id =
        typeof body.id === 'string' && body.id.length > 0 ? body.id : makePublisherId(domain);

      const input: CreatePublisherInput = {
        id,
        domain,
        walletAddress: sessionAddress,
        network: 'arcTestnet',
      };

      if (typeof body.defaultPriceAtomic === 'string' || typeof body.defaultPriceAtomic === 'number') {
        try {
          input.defaultPriceAtomic = atomicUsdc(BigInt(body.defaultPriceAtomic));
        } catch (err) {
          return reply
            .code(400)
            .send({ error: 'invalid_default_price', detail: (err as Error).message });
        }
      }
      if (typeof body.description === 'string') input.description = body.description;

      try {
        const created = await publishers.create(input);
        return reply.code(201).send({ publisher: created });
      } catch (err) {
        if (err instanceof PublisherAlreadyExistsError) {
          return reply.code(409).send({ error: 'already_exists', field: err.field, value: err.value });
        }
        throw err;
      }
    },
  );

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

  /**
   * Server-side integration probe. Auth required AND the session's address
   * must match the publisher's walletAddress — only the owner can probe
   * their own domain through this endpoint.
   */
  app.post<{ Params: { id: string } }>(
    '/publishers/:id/probe',
    { preHandler: requireAuth(auth) },
    async (req, reply) => {
      const publisher = await publishers.get(req.params.id);
      if (!publisher) return reply.code(404).send({ error: 'publisher not found' });

      if (publisher.walletAddress.toLowerCase() !== req.authAddress!.toLowerCase()) {
        return reply.code(403).send({ error: 'not_owner' });
      }

      const result = await probe.probePublisher(publisher.domain);
      return reply.send(result);
    },
  );
}
