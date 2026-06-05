import type { Hex } from '@crawlpay/types';

/**
 * Replay-protection store for EIP-3009 authorization nonces.
 *
 * Contract: `reserve` is atomic. Only one caller can succeed for a given
 * nonce. Production-grade implementations back this with Redis SETNX or an
 * INSERT against a UNIQUE column.
 *
 * Reservations are time-bounded — they expire at `expiresAtUnix` so the
 * store doesn't grow unbounded.
 */
export interface NonceTracker {
  reserve(nonce: Hex, expiresAtUnix: number): Promise<boolean>;
  isUsed(nonce: Hex): Promise<boolean>;
  /** Manual release — rarely needed outside tests. */
  release(nonce: Hex): Promise<void>;
}
