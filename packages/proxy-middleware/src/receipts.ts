import { sha256, toHex, type Address, type Hex } from 'viem';
import type {
  AtomicUsdc,
  CrawlPayReceipt,
  CrawlPayReceiptBody,
  Network,
} from '@crawlpay/types';
import { signReceipt, type ReceiptSigner } from '@crawlpay/receipt-signer';

export interface BuildReceiptInput {
  publisherId: string;
  publisherWallet: Address;
  crawlerWallet: Address;
  url: string;
  amount: AtomicUsdc;
  network: Network;
  authorizationNonce: Hex;
  timestamp?: number;
  crawlerAgentId?: string;
}

/**
 * Build a CrawlPayReceiptBody from settlement metadata and sign it.
 *
 * `urlHash = sha256(url + '\n' + timestamp)` binds the URL to the issuance
 * moment — defends against re-presenting a receipt as proof of a later fetch.
 */
export async function issueReceipt(
  input: BuildReceiptInput,
  signer: ReceiptSigner,
): Promise<CrawlPayReceipt> {
  const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
  const urlHash = sha256(toHex(`${input.url}\n${timestamp}`));

  const body: Omit<CrawlPayReceiptBody, 'facilitatorPubkey'> = {
    version: '1',
    publisherId: input.publisherId,
    publisherWallet: input.publisherWallet,
    crawlerWallet: input.crawlerWallet,
    crawlerAgentId: input.crawlerAgentId,
    url: input.url,
    urlHash,
    amount: input.amount.toString(),
    currency: 'USDC',
    network: input.network,
    authorizationNonce: input.authorizationNonce,
    timestamp,
  };

  return signReceipt(body, signer);
}

/** Encode a signed receipt for transport in the `Payment-Response` header. */
export function encodeReceiptHeader(receipt: CrawlPayReceipt): string {
  return Buffer.from(JSON.stringify(receipt), 'utf-8').toString('base64');
}

/** Decode a receipt from the `Payment-Response` header. */
export function decodeReceiptHeader(value: string): CrawlPayReceipt {
  return JSON.parse(Buffer.from(value, 'base64').toString('utf-8'));
}
