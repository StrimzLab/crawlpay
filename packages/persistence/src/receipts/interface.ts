import type { Address, CrawlPayReceipt, Hex } from '@crawlpay/types';

export interface ReceiptFilter {
  publisherId?: string;
  publisherWallet?: Address;
  crawlerWallet?: Address;
  fromTimestamp?: number;
  toTimestamp?: number;
  limit?: number;
  offset?: number;
}

/**
 * Persistent receipt store. Append-only by design — receipts are immutable
 * once issued. The on-chain `onchainTxHash` field can be backfilled later
 * via a separate update path (not part of this interface).
 */
export interface ReceiptRepository {
  insert(receipt: CrawlPayReceipt): Promise<void>;
  getByNonce(nonce: Hex): Promise<CrawlPayReceipt | null>;
  list(filter?: ReceiptFilter): Promise<CrawlPayReceipt[]>;
  count(filter?: ReceiptFilter): Promise<number>;
}
