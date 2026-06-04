import { describe, expect, it } from 'vitest';
import { generatePrivateKey } from 'viem/accounts';
import type { Address, Hex } from '@crawlpay/types';
import { atomicUsdc } from '@crawlpay/types';
import { PrivateKeyReceiptSigner, verifyReceipt } from '@crawlpay/receipt-signer';
import { decodeReceiptHeader, encodeReceiptHeader, issueReceipt } from '../receipts';

const PUBLISHER = '0x1111111111111111111111111111111111111111' as Address;
const CRAWLER = '0x2222222222222222222222222222222222222222' as Address;
const NONCE =
  '0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1' as Hex;

function baseInput() {
  return {
    publisherId: 'pub_test',
    publisherWallet: PUBLISHER,
    crawlerWallet: CRAWLER,
    url: 'https://example.com/article',
    amount: atomicUsdc(100n),
    network: 'arcTestnet' as const,
    authorizationNonce: NONCE,
  };
}

describe('issueReceipt', () => {
  it('produces a signed CrawlPayReceipt that verifies', async () => {
    const signer = new PrivateKeyReceiptSigner(generatePrivateKey());
    const receipt = await issueReceipt(baseInput(), signer);

    expect(receipt.version).toBe('1');
    expect(receipt.publisherId).toBe('pub_test');
    expect(receipt.amount).toBe('100');
    expect(receipt.currency).toBe('USDC');
    expect(receipt.network).toBe('arcTestnet');
    expect(receipt.urlHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(receipt.facilitatorPubkey.toLowerCase()).toBe(signer.address.toLowerCase());

    const verification = await verifyReceipt(receipt);
    expect(verification.valid).toBe(true);
  });

  it('produces a different urlHash when the timestamp changes', async () => {
    const signer = new PrivateKeyReceiptSigner(generatePrivateKey());
    const a = await issueReceipt({ ...baseInput(), timestamp: 1000 }, signer);
    const b = await issueReceipt({ ...baseInput(), timestamp: 2000 }, signer);
    expect(a.urlHash).not.toBe(b.urlHash);
    expect(a.signature).not.toBe(b.signature);
  });

  it('preserves crawlerAgentId when provided', async () => {
    const signer = new PrivateKeyReceiptSigner(generatePrivateKey());
    const receipt = await issueReceipt({ ...baseInput(), crawlerAgentId: '42' }, signer);
    expect(receipt.crawlerAgentId).toBe('42');
    expect((await verifyReceipt(receipt)).valid).toBe(true);
  });
});

describe('encodeReceiptHeader / decodeReceiptHeader', () => {
  it('round-trips a signed receipt unchanged', async () => {
    const signer = new PrivateKeyReceiptSigner(generatePrivateKey());
    const receipt = await issueReceipt(baseInput(), signer);
    const encoded = encodeReceiptHeader(receipt);
    expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
    const decoded = decodeReceiptHeader(encoded);
    expect(decoded).toEqual(receipt);
  });
});
