import type { FastifyInstance } from 'fastify';
import type { FacilitatorService } from '../services/facilitator-service';

/**
 * Exposes the facilitator's receipt-signing public address so third parties
 * can verify CrawlPayReceipts independently — without DB access or trusting
 * the facilitator to verify on their behalf.
 */
export function pubkeyRoutes(app: FastifyInstance, service: FacilitatorService): void {
  app.get('/pubkey', async () => ({
    address: service.signerAddress,
    version: '1',
  }));
}
