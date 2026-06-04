import type { Address, Hex, Network } from './primitives';

export const CRAWLPAY_RECEIPT_VERSION = '1' as const;
export type CrawlPayReceiptVersion = typeof CRAWLPAY_RECEIPT_VERSION;

/**
 * Unsigned receipt body — canonicalized for signing.
 *
 * Field order in the interface declaration is NOT significant.
 * `canonicalizeReceipt` sorts keys lexicographically before hashing,
 * so receipts hash the same regardless of how they're constructed.
 */
export interface CrawlPayReceiptBody {
  version: CrawlPayReceiptVersion;
  publisherId: string;
  publisherWallet: Address;
  crawlerWallet: Address;
  crawlerAgentId?: string;
  url: string;
  /** sha256 hex of `url + '\n' + timestamp` */
  urlHash: Hex;
  /** Atomic USDC, stringified. */
  amount: string;
  currency: 'USDC';
  network: Network;
  /** EIP-3009 nonce of the underlying authorization. */
  authorizationNonce: Hex;
  /** Unix seconds at which the receipt was issued. */
  timestamp: number;
  /** Public address of the facilitator key that signed this receipt. */
  facilitatorPubkey: Address;
  /** Gateway batch ID once the authorization is included in a batch. */
  batchId?: string;
  /** On-chain settlement tx hash on Arc, once available. */
  onchainTxHash?: Hex;
}

/**
 * A receipt body plus the facilitator's signature over its canonical form.
 * This is the portable proof-of-access — verifiable with nothing but the
 * receipt itself and the facilitator's public address.
 */
export interface CrawlPayReceipt extends CrawlPayReceiptBody {
  /** ECDSA signature over keccak256(canonicalize(body)). */
  signature: Hex;
}
