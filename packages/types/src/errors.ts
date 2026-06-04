/**
 * Error codes returned in 402 responses and verification failures.
 *
 * Union of (a) CrawlPay-defined codes for our middleware/SDK, and
 * (b) Gateway API codes from
 * https://developers.circle.com/gateway/nanopayments/references/sdk
 */
export type CrawlPayErrorCode =
  // CrawlPay / x402 middleware
  | 'invalid_signature'
  | 'amount_exceeded'
  | 'recipient_mismatch'
  | 'replay'
  | 'expired'
  | 'insufficient_balance'
  | 'reputation_too_low'
  | 'offer_changed'
  | 'crawler_banned'
  | 'rate_limited'
  | 'facilitator_error'
  | 'facilitator_unavailable'
  // Gateway-specific
  | 'unsupported_scheme'
  | 'unsupported_network'
  | 'unsupported_asset'
  | 'invalid_payload'
  | 'address_mismatch'
  | 'amount_mismatch'
  | 'authorization_not_yet_valid'
  | 'authorization_expired'
  | 'authorization_validity_too_short'
  | 'self_transfer'
  | 'nonce_already_used'
  | 'unsupported_domain'
  | 'wallet_not_found'
  | 'unexpected_error';

export class CrawlPayError extends Error {
  constructor(
    public readonly code: CrawlPayErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CrawlPayError';
  }
}
