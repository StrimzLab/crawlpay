import { describe, expect, it } from 'vitest';
import type { Address, CrawlPayReceipt, Hex } from '@crawlpay/types';
import { MemoryReceiptStore } from '../receipt-store';

function makeReceipt(overrides: Partial<CrawlPayReceipt> = {}): CrawlPayReceipt {
  return {
    version: '1',
    publisherId: 'pub_a',
    publisherWallet: '0x1111111111111111111111111111111111111111' as Address,
    crawlerWallet: '0x2222222222222222222222222222222222222222' as Address,
    url: 'https://example.com/x',
    urlHash: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as Hex,
    amount: '100',
    currency: 'USDC',
    network: 'arcTestnet',
    authorizationNonce:
      '0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1' as Hex,
    timestamp: 1745712000,
    facilitatorPubkey: '0x3333333333333333333333333333333333333333' as Address,
    signature: '0xfeed' as Hex,
    ...overrides,
  };
}

describe('MemoryReceiptStore', () => {
  it('stores and retrieves a receipt by nonce', async () => {
    const store = new MemoryReceiptStore();
    const receipt = makeReceipt();
    await store.put(receipt);
    expect(await store.getByNonce(receipt.authorizationNonce)).toEqual(receipt);
  });

  it('returns null when no receipt matches the nonce', async () => {
    const store = new MemoryReceiptStore();
    expect(
      await store.getByNonce(
        '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
      ),
    ).toBeNull();
  });

  it('filters by publisher and timestamp range, sorted newest-first', async () => {
    const store = new MemoryReceiptStore();
    await store.put(
      makeReceipt({
        authorizationNonce:
          '0x0000000000000000000000000000000000000000000000000000000000000001' as Hex,
        publisherId: 'pub_a',
        timestamp: 1000,
      }),
    );
    await store.put(
      makeReceipt({
        authorizationNonce:
          '0x0000000000000000000000000000000000000000000000000000000000000002' as Hex,
        publisherId: 'pub_b',
        timestamp: 2000,
      }),
    );
    await store.put(
      makeReceipt({
        authorizationNonce:
          '0x0000000000000000000000000000000000000000000000000000000000000003' as Hex,
        publisherId: 'pub_a',
        timestamp: 3000,
      }),
    );

    const all = await store.list();
    expect(all.map((r) => r.timestamp)).toEqual([3000, 2000, 1000]);

    const aOnly = await store.list({ publisherId: 'pub_a' });
    expect(aOnly).toHaveLength(2);
    expect(aOnly.every((r) => r.publisherId === 'pub_a')).toBe(true);

    const inRange = await store.list({ fromTimestamp: 1500, toTimestamp: 2500 });
    expect(inRange).toHaveLength(1);
    expect(inRange[0]!.timestamp).toBe(2000);

    expect(await store.count({ publisherId: 'pub_a' })).toBe(2);
  });

  it('respects the limit parameter', async () => {
    const store = new MemoryReceiptStore();
    for (let i = 0; i < 5; i += 1) {
      const nonce = ('0x' + 'a'.repeat(63) + i.toString(16)) as Hex;
      await store.put(makeReceipt({ authorizationNonce: nonce, timestamp: 1000 + i }));
    }
    const out = await store.list({ limit: 3 });
    expect(out).toHaveLength(3);
  });
});
