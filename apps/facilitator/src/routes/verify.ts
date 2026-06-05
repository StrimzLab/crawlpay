import type { FastifyInstance } from 'fastify';
import type { Address } from 'viem';
import type { PaymentPayload, PaymentRequirement } from '@crawlpay/types';
import type { FacilitatorService } from '../services/facilitator-service';

interface VerifyBody {
  publisherId?: unknown;
  publisherWallet?: unknown;
  url?: unknown;
  paymentPayload?: unknown;
  paymentRequirements?: unknown;
  crawlerAgentId?: unknown;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function isAddress(v: unknown): v is Address {
  return typeof v === 'string' && ADDRESS_RE.test(v);
}

export function verifyRoutes(app: FastifyInstance, service: FacilitatorService): void {
  app.post('/verify', async (req, reply) => {
    const body = (req.body ?? {}) as VerifyBody;

    if (typeof body.publisherId !== 'string' || body.publisherId.length === 0) {
      return reply.code(400).send({ error: 'publisherId required (non-empty string)' });
    }
    if (!isAddress(body.publisherWallet)) {
      return reply.code(400).send({ error: 'publisherWallet required (0x-prefixed address)' });
    }
    if (typeof body.url !== 'string' || body.url.length === 0) {
      return reply.code(400).send({ error: 'url required (non-empty string)' });
    }
    if (!isObject(body.paymentPayload)) {
      return reply.code(400).send({ error: 'paymentPayload required (object)' });
    }
    if (!isObject(body.paymentRequirements)) {
      return reply.code(400).send({ error: 'paymentRequirements required (object)' });
    }

    const result = await service.verify({
      publisherId: body.publisherId,
      publisherWallet: body.publisherWallet,
      url: body.url,
      paymentPayload: body.paymentPayload as unknown as PaymentPayload,
      paymentRequirements: body.paymentRequirements as unknown as PaymentRequirement,
      crawlerAgentId: typeof body.crawlerAgentId === 'string' ? body.crawlerAgentId : undefined,
    });

    if (!result.ok) {
      return reply.code(402).send(result);
    }
    return reply.code(200).send(result);
  });
}
