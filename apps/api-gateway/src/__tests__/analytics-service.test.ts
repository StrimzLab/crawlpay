import { describe, expect, it } from 'vitest';
import type { Address, CrawlPayReceipt, Hex } from '@crawlpay/types';
import { MemoryReceiptRepository } from '@crawlpay/persistence';
import { RepositoryAnalyticsService } from '../services/analytics-service';

const PUBLISHER_A = '0x1111111111111111111111111111111111111111' as Address;
const CRAWLER_A = '0x2222222222222222222222222222222222222222' as Address;
const CRAWLER_B = '0x3333333333333333333333333333333333333333' as Address;
const FACILITATOR = '0x9999999999999999999999999999999999999999' as Address;

// Anchor NOW to mid-day UTC so receipts a few hours back don't accidentally
// cross a date boundary and miss the daily bucket they belong to.
const NOW = Math.floor(Date.UTC(2025, 3, 27, 12, 0, 0) / 1000); // 2025-04-27 12:00 UTC
const DAY = 86_400;

function nonceFrom(n: number): Hex {
  return ('0x' + n.toString(16).padStart(64, '0')) as Hex;
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
    timestamp: NOW,
    facilitatorPubkey: FACILITATOR,
    signature: '0xfeed' as Hex,
    ...overrides,
  };
}

async function seedRepo(receipts: CrawlPayReceipt[]) {
  const repo = new MemoryReceiptRepository();
  for (const r of receipts) await repo.insert(r);
  return repo;
}

describe('RepositoryAnalyticsService.forPublisher', () => {
  it('sums revenue, counts requests, dedups crawlers within the window', async () => {
    const repo = await seedRepo([
      makeReceipt({ authorizationNonce: nonceFrom(1), amount: '100', timestamp: NOW - 1 * DAY }),
      makeReceipt({ authorizationNonce: nonceFrom(2), amount: '300', timestamp: NOW - 2 * DAY, crawlerWallet: CRAWLER_B }),
      makeReceipt({ authorizationNonce: nonceFrom(3), amount: '100', timestamp: NOW - 3 * DAY }),
    ]);
    const svc = new RepositoryAnalyticsService(repo, () => NOW);

    const a = await svc.forPublisher('pub_a', 'week');
    expect(a.totalRevenueAtomic).toBe('500');
    expect(a.totalRequestCount).toBe(3);
    expect(a.uniqueCrawlers).toBe(2);
    expect(a.window).toBe('week');
    expect(a.publisherId).toBe('pub_a');
  });

  it('emits a daily series with zero-padded buckets', async () => {
    const repo = await seedRepo([
      makeReceipt({ authorizationNonce: nonceFrom(1), amount: '100', timestamp: NOW - 1 * DAY }),
      makeReceipt({ authorizationNonce: nonceFrom(2), amount: '200', timestamp: NOW - 1 * DAY, crawlerWallet: CRAWLER_B }),
      makeReceipt({ authorizationNonce: nonceFrom(3), amount: '500', timestamp: NOW - 4 * DAY }),
    ]);
    const svc = new RepositoryAnalyticsService(repo, () => NOW);

    const a = await svc.forPublisher('pub_a', 'week');
    expect(a.daily).toHaveLength(7);

    const yest = new Date((NOW - 1 * DAY) * 1000).toISOString().slice(0, 10);
    const yestBucket = a.daily.find((d) => d.date === yest);
    expect(yestBucket?.totalAtomic).toBe('300');
    expect(yestBucket?.requestCount).toBe(2);
    expect(yestBucket?.uniqueCounterparties).toBe(2);

    const empty = a.daily.find((d) => d.totalAtomic === '0');
    expect(empty).toBeDefined();
  });

  it('excludes receipts outside the window', async () => {
    const repo = await seedRepo([
      makeReceipt({ authorizationNonce: nonceFrom(1), amount: '100', timestamp: NOW - 1 * DAY }),
      makeReceipt({ authorizationNonce: nonceFrom(2), amount: '999', timestamp: NOW - 10 * DAY }),
    ]);
    const svc = new RepositoryAnalyticsService(repo, () => NOW);

    const a = await svc.forPublisher('pub_a', 'week');
    expect(a.totalRevenueAtomic).toBe('100');
    expect(a.totalRequestCount).toBe(1);
  });
});

describe('RepositoryAnalyticsService.forCrawler', () => {
  it('sums spend across publishers within the window', async () => {
    const repo = await seedRepo([
      makeReceipt({ authorizationNonce: nonceFrom(1), publisherId: 'pub_a', amount: '100', timestamp: NOW - 1 * DAY }),
      makeReceipt({ authorizationNonce: nonceFrom(2), publisherId: 'pub_b', amount: '400', timestamp: NOW - 2 * DAY }),
      makeReceipt({ authorizationNonce: nonceFrom(3), publisherId: 'pub_a', amount: '100', timestamp: NOW - 3 * DAY }),
    ]);
    const svc = new RepositoryAnalyticsService(repo, () => NOW);

    const a = await svc.forCrawler(CRAWLER_A, 'week');
    expect(a.totalSpendAtomic).toBe('600');
    expect(a.totalRequestCount).toBe(3);
    expect(a.uniquePublishers).toBe(2);
  });

  it('day window produces a single bucket', async () => {
    const repo = await seedRepo([
      makeReceipt({ authorizationNonce: nonceFrom(1), amount: '100', timestamp: NOW - 3 * 3600 }),
    ]);
    const svc = new RepositoryAnalyticsService(repo, () => NOW);

    const a = await svc.forCrawler(CRAWLER_A, 'day');
    expect(a.daily).toHaveLength(1);
    expect(a.daily[0]!.totalAtomic).toBe('100');
  });
});
