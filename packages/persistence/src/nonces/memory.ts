import type { Hex } from '@crawlpay/types';
import type { NonceTracker } from './interface';

/**
 * In-process nonce tracker. Safe for single-instance deployments and tests.
 * Multi-process / multi-instance deployments must use RedisNonceTracker.
 *
 * Expired entries are swept lazily on every operation. No background timer.
 */
export class MemoryNonceTracker implements NonceTracker {
  readonly #entries = new Map<Hex, number>();
  readonly #now: () => number;

  constructor(now: () => number = () => Math.floor(Date.now() / 1000)) {
    this.#now = now;
  }

  async reserve(nonce: Hex, expiresAtUnix: number): Promise<boolean> {
    this.#sweep();
    if (this.#entries.has(nonce)) return false;
    this.#entries.set(nonce, expiresAtUnix);
    return true;
  }

  async isUsed(nonce: Hex): Promise<boolean> {
    this.#sweep();
    return this.#entries.has(nonce);
  }

  async release(nonce: Hex): Promise<void> {
    this.#entries.delete(nonce);
  }

  #sweep(): void {
    const now = this.#now();
    for (const [nonce, expiresAt] of this.#entries) {
      if (expiresAt < now) this.#entries.delete(nonce);
    }
  }
}
