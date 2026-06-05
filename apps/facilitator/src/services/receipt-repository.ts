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
 * Persistent receipt store. Conceptually append-only: receipts are immutable
 * once issued (the on-chain settlement reference may be backfilled later but
 * the body and signature don't change).
 */
export interface ReceiptRepository {
  insert(receipt: CrawlPayReceipt): Promise<void>;
  getByNonce(nonce: Hex): Promise<CrawlPayReceipt | null>;
  list(filter?: ReceiptFilter): Promise<CrawlPayReceipt[]>;
  count(filter?: ReceiptFilter): Promise<number>;
}

export class MemoryReceiptRepository implements ReceiptRepository {
  readonly #byNonce = new Map<Hex, CrawlPayReceipt>();

  async insert(receipt: CrawlPayReceipt): Promise<void> {
    this.#byNonce.set(receipt.authorizationNonce, receipt);
  }

  async getByNonce(nonce: Hex): Promise<CrawlPayReceipt | null> {
    return this.#byNonce.get(nonce) ?? null;
  }

  async list(filter: ReceiptFilter = {}): Promise<CrawlPayReceipt[]> {
    let out = Array.from(this.#byNonce.values()).filter((r) => matches(r, filter));
    out.sort((a, b) => b.timestamp - a.timestamp);
    if (filter.offset !== undefined) out = out.slice(filter.offset);
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
  if (f.publisherId !== undefined && r.publisherId !== f.publisherId) return false;
  if (
    f.publisherWallet !== undefined &&
    r.publisherWallet.toLowerCase() !== f.publisherWallet.toLowerCase()
  ) {
    return false;
  }
  if (
    f.crawlerWallet !== undefined &&
    r.crawlerWallet.toLowerCase() !== f.crawlerWallet.toLowerCase()
  ) {
    return false;
  }
  if (f.fromTimestamp !== undefined && r.timestamp < f.fromTimestamp) return false;
  if (f.toTimestamp !== undefined && r.timestamp > f.toTimestamp) return false;
  return true;
}
