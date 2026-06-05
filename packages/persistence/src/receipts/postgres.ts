import type { Pool } from 'pg';
import type { Address, CrawlPayReceipt, Hex } from '@crawlpay/types';
import type { ReceiptFilter, ReceiptRepository } from './interface';

interface ReceiptRow {
  authorization_nonce: string;
  publisher_id: string;
  publisher_wallet: string;
  crawler_wallet: string;
  crawler_agent_id: string | null;
  url: string;
  url_hash: string;
  /** BIGINT comes back as string from pg by default to preserve precision. */
  amount_atomic: string;
  network: string;
  timestamp: string;
  facilitator_pubkey: string;
  signature: string;
  batch_id: string | null;
  onchain_tx_hash: string | null;
}

/**
 * Postgres-backed receipt repository.
 *
 * Inserts use ON CONFLICT (authorization_nonce) DO NOTHING — the nonce is
 * already gated by the NonceTracker (Redis) before settle, so duplicate
 * inserts here mean a race between facilitator instances, which we want to
 * treat as a silent no-op rather than an error.
 *
 * Backfilling on-chain settlement fields (batch_id, onchain_tx_hash,
 * settled_at) is intentionally not exposed through this interface — that
 * happens via a separate worker UPDATE path.
 */
export class PostgresReceiptRepository implements ReceiptRepository {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async insert(receipt: CrawlPayReceipt): Promise<void> {
    await this.#pool.query(
      `INSERT INTO receipts (
         authorization_nonce, publisher_id, publisher_wallet, crawler_wallet,
         crawler_agent_id, url, url_hash, amount_atomic, network, timestamp,
         facilitator_pubkey, signature, batch_id, onchain_tx_hash
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (authorization_nonce) DO NOTHING`,
      [
        receipt.authorizationNonce,
        receipt.publisherId,
        receipt.publisherWallet,
        receipt.crawlerWallet,
        receipt.crawlerAgentId ?? null,
        receipt.url,
        receipt.urlHash,
        receipt.amount,
        receipt.network,
        receipt.timestamp,
        receipt.facilitatorPubkey,
        receipt.signature,
        receipt.batchId ?? null,
        receipt.onchainTxHash ?? null,
      ],
    );
  }

  async getByNonce(nonce: Hex): Promise<CrawlPayReceipt | null> {
    const { rows } = await this.#pool.query<ReceiptRow>(
      'SELECT * FROM receipts WHERE authorization_nonce = $1',
      [nonce],
    );
    return rows[0] ? rowToReceipt(rows[0]) : null;
  }

  async list(filter: ReceiptFilter = {}): Promise<CrawlPayReceipt[]> {
    const { sql, params } = buildWhere(filter);
    const limit = filter.limit !== undefined ? ` LIMIT ${asPositiveInt(filter.limit)}` : '';
    const offset = filter.offset !== undefined ? ` OFFSET ${asPositiveInt(filter.offset)}` : '';
    const { rows } = await this.#pool.query<ReceiptRow>(
      `SELECT * FROM receipts${sql} ORDER BY timestamp DESC${limit}${offset}`,
      params,
    );
    return rows.map(rowToReceipt);
  }

  async count(filter: ReceiptFilter = {}): Promise<number> {
    const { sql, params } = buildWhere(filter);
    const { rows } = await this.#pool.query<{ count: string }>(
      `SELECT COUNT(*)::bigint AS count FROM receipts${sql}`,
      params,
    );
    return Number(rows[0]?.count ?? 0);
  }
}

function buildWhere(filter: ReceiptFilter): { sql: string; params: unknown[] } {
  const params: unknown[] = [];
  const clauses: string[] = [];

  if (filter.publisherId !== undefined) {
    params.push(filter.publisherId);
    clauses.push(`publisher_id = $${params.length}`);
  }
  if (filter.publisherWallet !== undefined) {
    params.push(filter.publisherWallet.toLowerCase());
    clauses.push(`LOWER(publisher_wallet) = $${params.length}`);
  }
  if (filter.crawlerWallet !== undefined) {
    params.push(filter.crawlerWallet.toLowerCase());
    clauses.push(`LOWER(crawler_wallet) = $${params.length}`);
  }
  if (filter.fromTimestamp !== undefined) {
    params.push(filter.fromTimestamp);
    clauses.push(`timestamp >= $${params.length}`);
  }
  if (filter.toTimestamp !== undefined) {
    params.push(filter.toTimestamp);
    clauses.push(`timestamp <= $${params.length}`);
  }

  return {
    sql: clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

function asPositiveInt(n: number): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new RangeError(`limit/offset must be a non-negative integer, got ${n}`);
  }
  return n;
}

function rowToReceipt(row: ReceiptRow): CrawlPayReceipt {
  return {
    version: '1',
    publisherId: row.publisher_id,
    publisherWallet: row.publisher_wallet as Address,
    crawlerWallet: row.crawler_wallet as Address,
    crawlerAgentId: row.crawler_agent_id ?? undefined,
    url: row.url,
    urlHash: row.url_hash as Hex,
    amount: row.amount_atomic,
    currency: 'USDC',
    network: row.network as CrawlPayReceipt['network'],
    authorizationNonce: row.authorization_nonce as Hex,
    timestamp: Number(row.timestamp),
    facilitatorPubkey: row.facilitator_pubkey as Address,
    batchId: row.batch_id ?? undefined,
    onchainTxHash: (row.onchain_tx_hash as Hex | null) ?? undefined,
    signature: row.signature as Hex,
  };
}
