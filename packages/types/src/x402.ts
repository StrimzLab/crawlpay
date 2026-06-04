import type { Address, Hex, Caip2Network } from './primitives';
import type { Eip3009Authorization } from './eip3009';

/** x402 protocol version. Circle Gateway requires v2. */
export type X402Version = 2;

/** Payment scheme — currently only `exact` is supported by Gateway. */
export type PaymentScheme = 'exact';

/**
 * A single payment option in the 402 response's `accepts` array.
 * Represents one way the server is willing to accept payment.
 */
export interface PaymentRequirement {
  scheme: PaymentScheme;
  network: Caip2Network;
  /** Atomic USDC the server requires, stringified. */
  amount: string;
  /** Address that will receive payment. */
  payTo: Address;
  /** USDC contract address on the network. */
  asset: Address;
  /** Authorization validity window. Gateway uses 345600s (4 days). */
  maxTimeoutSeconds: number;
  resource?: string;
  description?: string;
  mimeType?: string;
  /**
   * Scheme-specific extra metadata. For Gateway, includes
   * `verifyingContract` (the GatewayWallet address) and `name`
   * (= 'GatewayWalletBatched'). CrawlPay-specific fields are prefixed
   * with `crawlpay_`.
   */
  extra?: PaymentRequirementExtra;
}

export interface PaymentRequirementExtra {
  name?: 'GatewayWalletBatched' | string;
  version?: string;
  verifyingContract?: Address;
  crawlpay_publisher_id?: string;
  crawlpay_facilitator?: string;
  crawlpay_erc8004_agent_id?: string;
  crawlpay_reputation_score?: string;
  crawlpay_catalog_url?: string;
  [k: string]: unknown;
}

/** Full body of a 402 response. */
export interface PaymentRequiredResponse {
  x402Version: X402Version;
  accepts: PaymentRequirement[];
  error?: string;
}

/**
 * Payload included in the `Payment-Signature` header (base64-encoded JSON).
 * Sent by the buyer after signing an EIP-3009 authorization.
 */
export interface PaymentPayload {
  x402Version: X402Version;
  scheme: PaymentScheme;
  network: Caip2Network;
  payload: {
    authorization: Eip3009Authorization;
    signature: Hex;
  };
}

/**
 * x402 v2 HTTP header names. Note the *single* `Payment-*` prefix
 * (the PRD's `X-PAYMENT*` headers were a pre-v2 misconception).
 */
export const X402_HEADERS = {
  required: 'Payment-Required',
  signature: 'Payment-Signature',
  response: 'Payment-Response',
} as const;
