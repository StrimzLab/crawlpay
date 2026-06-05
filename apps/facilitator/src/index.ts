import { PrivateKeyReceiptSigner } from '@crawlpay/receipt-signer';
import { loadConfig } from './config';
import { createLogger } from './logger';
import { buildServer } from './server';
import { CircleFacilitatorAdapter } from './services/circle-facilitator';
import { FacilitatorService } from './services/facilitator-service';
import { MemoryNonceTracker } from './services/nonce-tracker';
import { MemoryReceiptRepository } from './services/receipt-repository';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const signer = new PrivateKeyReceiptSigner(config.receiptSigningKey);
  const facilitator = new CircleFacilitatorAdapter(config.gatewayApiUrl);
  const nonces = new MemoryNonceTracker();
  const receipts = new MemoryReceiptRepository();

  const service = new FacilitatorService({
    facilitator,
    signer,
    nonces,
    receipts,
    network: config.network,
  });

  const server = buildServer({ service, network: config.network, logger });

  await server.listen({ port: config.port, host: '0.0.0.0' });
  logger.info(
    {
      port: config.port,
      network: config.network,
      facilitatorAddress: service.signerAddress,
      gatewayApiUrl: config.gatewayApiUrl,
      storage: 'memory',
    },
    'crawlpay-facilitator listening',
  );
}

main().catch((err) => {
  console.error('Failed to start crawlpay-facilitator:', err);
  process.exit(1);
});
