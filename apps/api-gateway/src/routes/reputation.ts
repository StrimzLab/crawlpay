import type { FastifyInstance } from 'fastify';
import type { Address } from 'viem';
import type { ReputationService } from '../services/reputation-service';

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

/**
 * Public read-only ERC-8004 reputation lookup.
 *
 * GET /reputation/:address →
 *   {
 *     reputation: {
 *       agent: { agentId, owner, metadataURI } | null,
 *       feedbackCount: number,
 *       avgScore: number | null
 *     }
 *   }
 *
 * Reads are cached for 5 minutes (in-memory) since on-chain queries are slow
 * and reputation rarely changes block-to-block. Auth not required —
 * reputation is public on-chain data.
 */
export function reputationRoutes(app: FastifyInstance, reputation: ReputationService): void {
  app.get<{ Params: { address: string } }>('/reputation/:address', async (req, reply) => {
    if (!ADDRESS_RE.test(req.params.address)) {
      return reply.code(400).send({ error: 'address must be 0x-prefixed (40 hex chars)' });
    }
    const summary = await reputation.getReputation(req.params.address as Address);
    return reply.send({ reputation: summary });
  });
}
