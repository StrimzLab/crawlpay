import IORedis from 'ioredis';
import { Pool } from 'pg';
import { PrivateKeyReceiptSigner } from '@crawlpay/receipt-signer';
import {
  MemoryNonceTracker,
  MemoryReceiptRepository,
  PostgresReceiptRepository,
  RedisNonceTracker,
  type NonceTracker,
  type ReceiptRepository,
} from '@crawlpay/persistence';
import { loadConfig } from './config';
import { createLogger } from './logger';
import { buildServer } from './server';
import { CircleFacilitatorAdapter } from './services/circle-facilitator';
import { FacilitatorService } from './services/facilitator-service';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  const signer = new PrivateKeyReceiptSigner(config.receiptSigningKey);
  const facilitator = new CircleFacilitatorAdapter(config.gatewayApiUrl);

  let nonces: NonceTracker;
  let receipts: ReceiptRepository;
  let storage: 'memory' | 'postgres+redis' | 'mixed';

  if (config.databaseUrl && config.redisUrl) {
    const pool = new Pool({ connectionString: config.databaseUrl });
    const redis = new IORedis(config.redisUrl);
    nonces = new RedisNonceTracker(redis);
    receipts = new PostgresReceiptRepository(pool);
    storage = 'postgres+redis';
  } else if (config.databaseUrl) {
    const pool = new Pool({ connectionString: config.databaseUrl });
    nonces = new MemoryNonceTracker();
    receipts = new PostgresReceiptRepository(pool);
    storage = 'mixed';
    logger.warn('REDIS_URL not set — using MemoryNonceTracker. Single-instance only.');
  } else if (config.redisUrl) {
    const redis = new IORedis(config.redisUrl);
    nonces = new RedisNonceTracker(redis);
    receipts = new MemoryReceiptRepository();
    storage = 'mixed';
    logger.warn('DATABASE_URL not set — using MemoryReceiptRepository. Receipts are NOT persisted.');
  } else {
    nonces = new MemoryNonceTracker();
    receipts = new MemoryReceiptRepository();
    storage = 'memory';
    logger.warn('Running in memory-only mode. Suitable for demo/testing only.');
  }

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
      storage,
    },
    'crawlpay-facilitator listening',
  );
}

main().catch((err) => {
  console.error('Failed to start crawlpay-facilitator:', err);
  process.exit(1);
});
