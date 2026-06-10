import { randomBytes } from 'node:crypto';
import type { Redis } from 'ioredis';

const PREFIX = 'crawlpay:auth:nonce:';
const TTL_SECONDS = 5 * 60;

/**
 * Single-use nonces for SIWE login.
 *
 * Distinct from the x402 NonceTracker in @crawlpay/persistence — that one
 * gates EIP-3009 authorizations. These nonces gate SIWE login messages.
 * Both have similar shape (atomic reserve, TTL, consume) but different
 * lifetimes and key prefixes.
 */
export interface AuthNonceStore {
  /** Mint a fresh nonce and store it with TTL. */
  create(): Promise<string>;
  /** Atomically check-and-delete. Returns true iff the nonce existed and was just consumed. */
  consume(nonce: string): Promise<boolean>;
}

export class RedisAuthNonceStore implements AuthNonceStore {
  constructor(private readonly redis: Redis) {}

  async create(): Promise<string> {
    const nonce = randomBytes(16).toString('hex');
    await this.redis.set(`${PREFIX}${nonce}`, '1', 'EX', TTL_SECONDS);
    return nonce;
  }

  async consume(nonce: string): Promise<boolean> {
    const deleted = await this.redis.del(`${PREFIX}${nonce}`);
    return deleted === 1;
  }
}

/**
 * In-process fallback for single-instance dev. Production must use Redis.
 */
export class MemoryAuthNonceStore implements AuthNonceStore {
  readonly #entries = new Map<string, number>();

  async create(): Promise<string> {
    this.#sweep();
    const nonce = randomBytes(16).toString('hex');
    this.#entries.set(nonce, Math.floor(Date.now() / 1000) + TTL_SECONDS);
    return nonce;
  }

  async consume(nonce: string): Promise<boolean> {
    this.#sweep();
    if (!this.#entries.has(nonce)) return false;
    this.#entries.delete(nonce);
    return true;
  }

  #sweep(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [n, exp] of this.#entries) {
      if (exp < now) this.#entries.delete(n);
    }
  }
}
