import type { CrawlPayErrorCode } from '@crawlpay/types';

export type RetryDecision = 'retry' | 'refresh-offer' | 'abort';

export interface RetryPolicy {
  /** Max attempts (including the first try) before giving up. */
  readonly maxAttempts: number;
  /** Decide what to do given an error code + the attempt number (1-indexed). */
  decide(errorCode: CrawlPayErrorCode | string, attempt: number): RetryDecision;
  /** Milliseconds to wait before attempt N (1-indexed). */
  backoffMs(attempt: number): number;
}

/**
 * Default retry policy keyed on the x402/Gateway error code table.
 *
 *   refresh-offer  — the auth itself is no good (bad nonce, expired). Re-fetch
 *                    the 402 offer and re-sign with fresh nonce + timestamps.
 *   retry          — transient infrastructure issue (rate limit, 500). Wait
 *                    and try the same payload again.
 *   abort          — terminal (insufficient balance, banned, recipient mismatch).
 *
 * Backoff: exponential starting at 500ms, capped at 60s.
 */
export class DefaultRetryPolicy implements RetryPolicy {
  readonly maxAttempts: number;

  constructor(maxAttempts = 3) {
    this.maxAttempts = maxAttempts;
  }

  decide(errorCode: CrawlPayErrorCode | string, attempt: number): RetryDecision {
    if (attempt >= this.maxAttempts) return 'abort';
    switch (errorCode) {
      case 'invalid_signature':
      case 'replay':
      case 'nonce_already_used':
      case 'expired':
      case 'authorization_expired':
      case 'authorization_not_yet_valid':
      case 'offer_changed':
        return 'refresh-offer';
      case 'rate_limited':
      case 'facilitator_error':
      case 'facilitator_unavailable':
      case 'unexpected_error':
        return 'retry';
      case 'insufficient_balance':
      case 'reputation_too_low':
      case 'crawler_banned':
      case 'recipient_mismatch':
      case 'amount_exceeded':
      case 'amount_mismatch':
      case 'address_mismatch':
      case 'self_transfer':
      case 'unsupported_scheme':
      case 'unsupported_network':
      case 'unsupported_asset':
      case 'unsupported_domain':
      case 'wallet_not_found':
      case 'authorization_validity_too_short':
      case 'invalid_payload':
        return 'abort';
      default:
        return 'abort';
    }
  }

  backoffMs(attempt: number): number {
    return Math.min(60_000, 500 * 2 ** (attempt - 1));
  }
}
