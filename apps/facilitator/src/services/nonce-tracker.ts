import type { Hex } from '@crawlpay/types';

/**
 * Replay-protection store for EIP-3009 authorization nonces.
 *
 * The contract: `reserve` is atomic — only one caller can succeed for a given
 * nonce. Production implementations back this with Redis SETNX or an INSERT
 * with UNIQUE constraint.
 */
export interface NonceTracker {
  /** Returns true if newly reserved, false if the nonce was already seen. */
  reserve(nonce: Hex, expiresAtUnix: number): Promise<boolean>;
  isUsed(nonce: Hex): Promise<boolean>;
  /** Manual release — rarely needed outside tests. */
  release(nonce: Hex): Promise<void>;
}

/**
 * In-process nonce tracker. Suitable for single-instance deployments and tests.
 * Sweeps expired entries lazily on every operation.
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
