/**
 * Demo crawl session — runs a self-contained 60-tx end-to-end loop.
 *
 *   1. Seeds a demo publisher into the receipts DB (Postgres if DATABASE_URL
 *      is set, in-memory otherwise).
 *   2. Boots an Express server on DEMO_PUBLISHER_PORT with @crawlpay/proxy-middleware
 *      paywalling 10 URLs at $0.0001 each. The onPayment hook writes each
 *      issued receipt to the receipts repository so the dashboards see them.
 *   3. Spins up a CrawlPayClient against that server and runs N fetches
 *      (rotating across the URL set) — each one exercises:
 *        - 402 challenge with price + Circle Gateway settlement target
 *        - EIP-3009 USDC authorization signing
 *        - Gateway batched settle via the facilitator
 *        - 200 + Payment-Response receipt header
 *        - Receipt persisted via the publisher's onPayment hook
 *   4. Tears down the publisher and exits with a summary.
 *
 * Prereqs (do these once before running the demo):
 *   - .env has CRAWLER_PRIVATE_KEY, PUBLISHER_ADDRESS, CRAWLPAY_RECEIPT_PRIVATE_KEY
 *   - The crawler wallet has USDC deposited into Circle Gateway on Arc Testnet
 *     (the smoke buyer (pnpm smoke:buyer) does this once)
 *   - For dashboard visibility: pnpm infra:up + pnpm migrate so DATABASE_URL works
 *
 * Run:
 *   pnpm demo
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import { Pool } from 'pg';
import { CrawlPayClient } from '@crawlpay/crawler-sdk';
import {
  MemoryPublisherRepository,
  MemoryReceiptRepository,
  PostgresPublisherRepository,
  PostgresReceiptRepository,
  type PublisherRepository,
  type ReceiptRepository,
} from '@crawlpay/persistence';
import {
  crawlpay,
  type PaymentEvent as MwPaymentEvent,
} from '@crawlpay/proxy-middleware';
import { PrivateKeyReceiptSigner } from '@crawlpay/receipt-signer';
import { atomicUsdc, dollarsToAtomic, type Address, type Hex } from '@crawlpay/types';

// ── Config ────────────────────────────────────────────────────────────────
const PORT = Number(process.env.DEMO_PUBLISHER_PORT ?? 4000);
const PUBLISHER_ADDRESS = process.env.PUBLISHER_ADDRESS as Address | undefined;
const CRAWLER_PRIVATE_KEY = process.env.CRAWLER_PRIVATE_KEY as Hex | undefined;
const RECEIPT_SIGNING_KEY = process.env.CRAWLPAY_RECEIPT_PRIVATE_KEY as Hex | undefined;
const DATABASE_URL = process.env.DATABASE_URL;
const TOTAL_FETCHES = Number(process.env.DEMO_FETCH_COUNT ?? 60);

const PUBLISHER_ID = 'pub_demoTechnotes';
const PUBLISHER_DOMAIN = 'demo-technotes.crawlpay.test';

const URLS = [
  '/articles/transformer-scaling-laws',
  '/research/rlhf-survey-2026',
  '/articles/state-space-models',
  '/articles/mixture-of-experts',
  '/research/long-context-eval',
  '/articles/quantization-deep-dive',
  '/research/synthetic-data',
  '/articles/agentic-rag',
  '/articles/diffusion-text',
  '/research/tokenizer-design',
] as const;

function requireEnv() {
  const missing: string[] = [];
  if (!PUBLISHER_ADDRESS) missing.push('PUBLISHER_ADDRESS');
  if (!CRAWLER_PRIVATE_KEY || !CRAWLER_PRIVATE_KEY.startsWith('0x')) {
    missing.push('CRAWLER_PRIVATE_KEY (0x-prefixed)');
  }
  if (!RECEIPT_SIGNING_KEY || !RECEIPT_SIGNING_KEY.startsWith('0x')) {
    missing.push('CRAWLPAY_RECEIPT_PRIVATE_KEY (0x-prefixed)');
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing env vars: ${missing.join(', ')}.\n` +
        'Copy .env.example to .env and fill these out — see scripts/smoke for how to generate keys.',
    );
  }
}

// ── Repo wiring ───────────────────────────────────────────────────────────
type Repos = {
  publishers: PublisherRepository;
  receipts: ReceiptRepository;
  pool: Pool | null;
  storage: 'postgres' | 'memory';
};

async function setupRepos(): Promise<Repos> {
  if (DATABASE_URL) {
    const pool = new Pool({ connectionString: DATABASE_URL });
    return {
      publishers: new PostgresPublisherRepository(pool),
      receipts: new PostgresReceiptRepository(pool),
      pool,
      storage: 'postgres',
    };
  }
  return {
    publishers: new MemoryPublisherRepository(),
    receipts: new MemoryReceiptRepository(),
    pool: null,
    storage: 'memory',
  };
}

async function seedPublisher(publishers: PublisherRepository) {
  const existing = await publishers.get(PUBLISHER_ID);
  if (existing) {
    console.log(`[demo] publisher ${PUBLISHER_ID} already exists — reusing`);
    return existing;
  }
  const created = await publishers.create({
    id: PUBLISHER_ID,
    domain: PUBLISHER_DOMAIN,
    walletAddress: PUBLISHER_ADDRESS!,
    network: 'arcTestnet',
    defaultPriceAtomic: atomicUsdc(100n), // $0.0001
    description: 'Demo publisher seeded by the 60-tx demo session script.',
  });
  console.log(`[demo] seeded publisher ${PUBLISHER_ID} → ${PUBLISHER_ADDRESS}`);
  return created;
}

// ── Publisher Express server ──────────────────────────────────────────────
async function startPublisherServer(receipts: ReceiptRepository): Promise<() => Promise<void>> {
  const app = express();

  app.use(
    crawlpay({
      publisherId: PUBLISHER_ID,
      publisherWallet: PUBLISHER_ADDRESS!,
      network: 'arcTestnet',
      defaultPrice: dollarsToAtomic('0.0001'),
      receiptSigner: new PrivateKeyReceiptSigner(RECEIPT_SIGNING_KEY!),
      onPayment: async (event: MwPaymentEvent) => {
        // Persist into whichever repo we set up — the dashboards read here.
        try {
          await receipts.insert(event.receipt);
        } catch (err) {
          console.warn(
            `[publisher] failed to persist receipt ${event.receipt.authorizationNonce}:`,
            err instanceof Error ? err.message : err,
          );
        }
      },
    }),
  );

  for (const url of URLS) {
    app.get(url, (_req, res) => {
      res.json({
        url,
        body: `Demo article body for ${url}. In production this would be the actual content.`,
      });
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[publisher] ✗ middleware error:', err instanceof Error ? err.message : err);
    if (!res.headersSent) res.status(500).json({ error: 'internal_error' });
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`[demo] publisher listening at http://localhost:${PORT}`);
      const close = () =>
        new Promise<void>((res, rej) => {
          server.close((err) => (err ? rej(err) : res()));
        });
      resolve(close);
    });
    server.on('error', reject);
  });
}

// ── Crawl loop ────────────────────────────────────────────────────────────
interface SessionStats {
  paidAtomic: bigint;
  success: number;
  failure: number;
  totalMs: number;
}

async function runCrawls(client: CrawlPayClient): Promise<SessionStats> {
  let paidAtomic = 0n;
  let success = 0;
  let failure = 0;
  const start = Date.now();

  for (let i = 0; i < TOTAL_FETCHES; i++) {
    const path = URLS[i % URLS.length]!;
    const url = `http://localhost:${PORT}${path}`;
    const tStart = Date.now();
    try {
      const result = await client.fetch(url);
      const elapsed = Date.now() - tStart;
      const paidDollars = Number(BigInt(result.paid ?? 0n)) / 1e6;
      paidAtomic += BigInt(result.paid ?? 0n);
      success++;
      const stamp = String(i + 1).padStart(String(TOTAL_FETCHES).length, ' ');
      console.log(
        `[crawl ${stamp}/${TOTAL_FETCHES}] ✓ ${result.status} ${path}  ` +
          `· $${paidDollars.toFixed(6)}  · ${elapsed}ms`,
      );
    } catch (err) {
      failure++;
      const msg = err instanceof Error ? err.message : String(err);
      const stamp = String(i + 1).padStart(String(TOTAL_FETCHES).length, ' ');
      console.error(`[crawl ${stamp}/${TOTAL_FETCHES}] ✗ ${path}  — ${msg}`);
    }
  }

  return { paidAtomic, success, failure, totalMs: Date.now() - start };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('─'.repeat(72));
  console.log(`CrawlPay demo session — ${TOTAL_FETCHES} paid crawls end-to-end`);
  console.log('─'.repeat(72));

  requireEnv();

  const repos = await setupRepos();
  console.log(`[demo] storage: ${repos.storage}${repos.storage === 'memory' ? ' (set DATABASE_URL for dashboard visibility)' : ''}`);

  await seedPublisher(repos.publishers);
  const closeServer = await startPublisherServer(repos.receipts);

  // Brief settle so the listening socket is ready before the first crawl.
  await new Promise((r) => setTimeout(r, 200));

  const client = new CrawlPayClient({
    privateKey: CRAWLER_PRIVATE_KEY!,
    network: 'arcTestnet',
    maxPerRequest: atomicUsdc(10_000n), // $0.01 hard cap per request
    userAgent: 'CrawlPay-Demo/1.0',
  });

  console.log(`[demo] crawler wallet: ${client.address}`);
  console.log('─'.repeat(72));

  let stats: SessionStats;
  try {
    stats = await runCrawls(client);
  } finally {
    await closeServer();
    if (repos.pool) await repos.pool.end();
  }

  console.log('─'.repeat(72));
  console.log(`[demo] ✓ session complete in ${(stats.totalMs / 1000).toFixed(1)}s`);
  console.log(`       success: ${stats.success}  ·  failure: ${stats.failure}`);
  console.log(`       total paid: $${(Number(stats.paidAtomic) / 1e6).toFixed(6)} USDC`);
  if (repos.storage === 'postgres') {
    console.log('       receipts persisted — view in the dashboard:');
    console.log(`         http://localhost:3000/publisher/${PUBLISHER_ID}`);
  } else {
    console.log('       (receipts kept in memory only — start Postgres + set DATABASE_URL to populate the dashboard)');
  }
  console.log('─'.repeat(72));
}

main().catch((err) => {
  console.error('\n[demo] ✗ FAILED');
  if (err instanceof Error) {
    console.error(`       ${err.name}: ${err.message}`);
    if ('cause' in err && err.cause) {
      console.error('       ↳ caused by:', err.cause);
    }
    if (err.stack) console.error(err.stack);
  } else {
    console.error(`       ${String(err)}`);
  }
  process.exit(1);
});
