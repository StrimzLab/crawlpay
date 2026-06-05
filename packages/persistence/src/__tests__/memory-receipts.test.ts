import { describe, expect, it } from 'vitest';
import type { Address, CrawlPayReceipt, Hex } from '@crawlpay/types';
import { MemoryReceiptRepository } from '../receipts/memory';

const PUBLISHER_A = '0x1111111111111111111111111111111111111111' as Address;
const CRAWLER_A = '0x2222222222222222222222222222222222222222' as Address;
const CRAWLER_B = '0x3333333333333333333333333333333333333333' as Address;

function nonceFrom(seed: number): Hex {
  return ('0x' + seed.toString(16).padStart(64, '0')) as Hex;
}

function makeReceipt(overrides: Partial<CrawlPayReceipt> = {}): CrawlPayReceipt {
  return {
    version: '1',
    publisherId: 'pub_a',
    publisherWallet: PUBLISHER_A,
    crawlerWallet: CRAWLER_A,
    url: 'https://example.com/x',
    urlHash: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex,
    amount: '100',
    currency: 'USDC',
    network: 'arcTestnet',
    authorizationNonce: nonceFrom(1),
    timestamp: 1745712000,
    facilitatorPubkey: '0x9999999999999999999999999999999999999999' as Address,
    signature: '0xfeed' as Hex,
    ...overrides,
  };
}

describe('MemoryReceiptRepository', () => {
  it('inserts and retrieves by nonce', async () => {
    const repo = new MemoryReceiptRepository();
    const r = makeReceipt({ authorizationNonce: nonceFrom(1) });
    await repo.insert(r);
    expect(await repo.getByNonce(nonceFrom(1))).toEqual(r);
    expect(await repo.getByNonce(nonceFrom(2))).toBeNull();
  });

  it('lists in newest-first order', async () => {
    const repo = new MemoryReceiptRepository();
    await repo.insert(makeReceipt({ authorizationNonce: nonceFrom(1), timestamp: 1000 }));
    await repo.insert(makeReceipt({ authorizationNonce: nonceFrom(2), timestamp: 3000 }));
    await repo.insert(makeReceipt({ authorizationNonce: nonceFrom(3), timestamp: 2000 }));

    const out = await repo.list();
    expect(out.map((r) => r.timestamp)).toEqual([3000, 2000, 1000]);
  });

  it('filters by publisherId / crawlerWallet / timestamp range', async () => {
    const repo = new MemoryReceiptRepository();
    await repo.insert(
      makeReceipt({ authorizationNonce: nonceFrom(1), publisherId: 'pub_a', crawlerWallet: CRAWLER_A, timestamp: 1000 }),
    );
    await repo.insert(
      makeReceipt({ authorizationNonce: nonceFrom(2), publisherId: 'pub_b', crawlerWallet: CRAWLER_A, timestamp: 2000 }),
    );
    await repo.insert(
      makeReceipt({ authorizationNonce: nonceFrom(3), publisherId: 'pub_a', crawlerWallet: CRAWLER_B, timestamp: 3000 }),
    );

    expect((await repo.list({ publisherId: 'pub_a' })).length).toBe(2);
    expect((await repo.list({ crawlerWallet: CRAWLER_B })).length).toBe(1);
    expect((await repo.list({ fromTimestamp: 1500, toTimestamp: 2500 })).length).toBe(1);
    expect(await repo.count({ publisherId: 'pub_a' })).toBe(2);
  });

  it('honors limit and offset', async () => {
    const repo = new MemoryReceiptRepository();
    for (let i = 0; i < 5; i += 1) {
      await repo.insert(makeReceipt({ authorizationNonce: nonceFrom(i + 1), timestamp: 1000 + i }));
    }
    const page = await repo.list({ limit: 2, offset: 1 });
    expect(page.length).toBe(2);
    // newest-first: ts 1004, 1003, 1002, 1001, 1000. offset 1 → starts at 1003.
    expect(page.map((r) => r.timestamp)).toEqual([1003, 1002]);
  });
});
