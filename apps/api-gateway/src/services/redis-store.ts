import IORedis, { type Redis } from 'ioredis';

/**
 * Single Redis connection shared across auth stores (nonces + sessions).
 *
 * The x402 nonce tracker in @crawlpay/persistence is a separate concern —
 * it gates EIP-3009 authorizations, not user sessions. Keeping the two
 * connections logically distinct makes it easy to scale them independently
 * later (e.g. move x402 nonces to a clustered Redis when traffic warrants).
 */
export function createRedisClient(url: string): Redis {
  return new IORedis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
}

export type { Redis };
