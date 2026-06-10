import './bigint-json'; // side-effect: patches BigInt.prototype.toJSON
import { Pool } from 'pg';
import {
  MemoryPublisherRepository,
  MemoryReceiptRepository,
  PostgresPublisherRepository,
  PostgresReceiptRepository,
  type PublisherRepository,
  type ReceiptRepository,
} from '@crawlpay/persistence';
import { loadConfig } from './config';
import { createLogger } from './logger';
import { buildServer } from './server';
import { RepositoryAnalyticsService } from './services/analytics-service';
import { SiweAuthService } from './services/auth-service';
import {
  MemoryAuthNonceStore,
  RedisAuthNonceStore,
  type AuthNonceStore,
} from './services/nonce-store';
import { IntegrationProbeService } from './services/probe-service';
import { createRedisClient } from './services/redis-store';
import { OnChainReputationService } from './services/reputation-service';
import {
  MemorySessionStore,
  RedisSessionStore,
  type SessionStore,
} from './services/session-store';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config.logLevel);

  let receipts: ReceiptRepository;
  let publishers: PublisherRepository;
  let storage: 'memory' | 'postgres';

  if (config.databaseUrl) {
    const pool = new Pool({ connectionString: config.databaseUrl });
    receipts = new PostgresReceiptRepository(pool);
    publishers = new PostgresPublisherRepository(pool);
    storage = 'postgres';
  } else {
    receipts = new MemoryReceiptRepository();
    publishers = new MemoryPublisherRepository();
    storage = 'memory';
    logger.warn('DATABASE_URL not set — using in-memory repositories. Suitable for demo only.');
  }

  // Auth stores — Redis-backed if available, otherwise in-memory (single-instance only).
  let nonces: AuthNonceStore;
  let sessions: SessionStore;
  let authStorage: 'redis' | 'memory';

  if (config.redisUrl) {
    const redis = createRedisClient(config.redisUrl);
    nonces = new RedisAuthNonceStore(redis);
    sessions = new RedisSessionStore(redis);
    authStorage = 'redis';
  } else {
    nonces = new MemoryAuthNonceStore();
    sessions = new MemorySessionStore();
    authStorage = 'memory';
    logger.warn(
      'REDIS_URL not set — SIWE nonces and sessions stored in memory; lost on restart.',
    );
  }

  const auth = new SiweAuthService(nonces, sessions, {
    domain: config.siwe.domain,
    allowedChainIds: config.siwe.allowedChainIds,
    statement: 'Sign in to CrawlPay',
  });

  const analytics = new RepositoryAnalyticsService(receipts);
  const probe = new IntegrationProbeService();
  const reputation = new OnChainReputationService(config.arcRpcUrl);

  const server = buildServer({
    receipts,
    publishers,
    analytics,
    auth,
    probe,
    reputation,
    health: { network: config.network, storage },
    logger,
  });

  await server.listen({ port: config.port, host: '0.0.0.0' });
  logger.info(
    {
      port: config.port,
      network: config.network,
      storage,
      authStorage,
      siweDomain: config.siwe.domain,
      siweChainIds: config.siwe.allowedChainIds,
      facilitatorUrl: config.facilitatorUrl,
      arcRpcUrl: config.arcRpcUrl,
    },
    'crawlpay-api-gateway listening',
  );
}

main().catch((err) => {
  console.error('Failed to start crawlpay-api-gateway:', err);
  process.exit(1);
});
