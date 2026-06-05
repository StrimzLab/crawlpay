import type { Address, CrawlPayReceipt, Hex } from '@crawlpay/types';

export interface ReceiptFilter {
  /** Inclusive lower bound on receipt.timestamp (unix seconds). */
  fromTimestamp?: number;
  /** Inclusive upper bound on receipt.timestamp (unix seconds). */
  toTimestamp?: number;
  publisherId?: string;
  publisherWallet?: Address;
  /** Max number of results to return. */
  limit?: number;
}

/**
 * Long-term receipt archive for the crawler.
 *
 * Distinct from FetchCache:
 *   - ReceiptStore: append-only audit log, queried for spend history + reports
 *   - FetchCache:   short-lived content cache, queried to skip re-payment
 */
export interface ReceiptStore {
  put(receipt: CrawlPayReceipt): Promise<void>;
  /** Look up by EIP-3009 authorization nonce (unique per payment). */
  getByNonce(nonce: Hex): Promise<CrawlPayReceipt | null>;
  list(filter?: ReceiptFilter): Promise<CrawlPayReceipt[]>;
  /** Count receipts matching the filter (cheaper than `list().length` for DB-backed impls). */
  count(filter?: ReceiptFilter): Promise<number>;
}

/** In-memory receipt store. Suitable for tests and short-lived scripts. */
export class MemoryReceiptStore implements ReceiptStore {
  readonly #byNonce = new Map<Hex, CrawlPayReceipt>();

  async put(receipt: CrawlPayReceipt): Promise<void> {
    this.#byNonce.set(receipt.authorizationNonce, receipt);
  }

  async getByNonce(nonce: Hex): Promise<CrawlPayReceipt | null> {
    return this.#byNonce.get(nonce) ?? null;
  }

  async list(filter: ReceiptFilter = {}): Promise<CrawlPayReceipt[]> {
    let out = Array.from(this.#byNonce.values()).filter((r) => matches(r, filter));
    out.sort((a, b) => b.timestamp - a.timestamp);
    if (filter.limit !== undefined) out = out.slice(0, filter.limit);
    return out;
  }

  async count(filter: ReceiptFilter = {}): Promise<number> {
    let n = 0;
    for (const r of this.#byNonce.values()) {
      if (matches(r, filter)) n += 1;
    }
    return n;
  }
}

function matches(r: CrawlPayReceipt, f: ReceiptFilter): boolean {
  if (f.fromTimestamp !== undefined && r.timestamp < f.fromTimestamp) return false;
  if (f.toTimestamp !== undefined && r.timestamp > f.toTimestamp) return false;
  if (f.publisherId !== undefined && r.publisherId !== f.publisherId) return false;
  if (
    f.publisherWallet !== undefined &&
    r.publisherWallet.toLowerCase() !== f.publisherWallet.toLowerCase()
  ) {
    return false;
  }
  return true;
}
