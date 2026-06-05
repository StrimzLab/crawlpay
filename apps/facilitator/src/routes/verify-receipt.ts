import type { FastifyInstance } from 'fastify';
import type { Address } from 'viem';
import type { CrawlPayReceipt } from '@crawlpay/types';
import type { FacilitatorService } from '../services/facilitator-service';

interface VerifyReceiptBody {
  receipt?: unknown;
  expectedSigner?: unknown;
}

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

function isAddress(v: unknown): v is Address {
  return typeof v === 'string' && ADDRESS_RE.test(v);
}

export function verifyReceiptRoutes(
  app: FastifyInstance,
  service: FacilitatorService,
): void {
  app.post('/verify-receipt', async (req, reply) => {
    const body = (req.body ?? {}) as VerifyReceiptBody;
    if (!body.receipt || typeof body.receipt !== 'object') {
      return reply.code(400).send({ error: 'receipt required (object)' });
    }
    const expectedSigner = isAddress(body.expectedSigner) ? body.expectedSigner : undefined;
    const result = await service.verifyReceiptSignature(
      body.receipt as CrawlPayReceipt,
      expectedSigner,
    );
    return reply.code(200).send(result);
  });
}
