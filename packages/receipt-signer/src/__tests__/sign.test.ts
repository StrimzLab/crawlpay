import { describe, it, expect } from 'vitest';
import { generatePrivateKey } from 'viem/accounts';
import type { Address, CrawlPayReceipt, CrawlPayReceiptBody } from '@crawlpay/types';
import {
  PrivateKeyReceiptSigner,
  canonicalizeReceipt,
  hashReceiptBody,
  signReceipt,
  verifyReceipt,
} from '../index';

const PUBLISHER_WALLET = '0x1111111111111111111111111111111111111111' as Address;
const CRAWLER_WALLET = '0x2222222222222222222222222222222222222222' as Address;
const FACILITATOR_PUBKEY = '0x3333333333333333333333333333333333333333' as Address;

function makeUnsignedBody(): Omit<CrawlPayReceiptBody, 'facilitatorPubkey'> {
  return {
    version: '1',
    publisherId: 'pub_abc123',
    publisherWallet: PUBLISHER_WALLET,
    crawlerWallet: CRAWLER_WALLET,
    url: 'https://example.com/articles/how-circle-built-arc',
    urlHash: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    amount: '100',
    currency: 'USDC',
    network: 'arcTestnet',
    authorizationNonce:
      '0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1',
    timestamp: 1745712001,
  };
}

describe('canonicalizeReceipt', () => {
  it('orders keys lexicographically', () => {
    const body: CrawlPayReceiptBody = { ...makeUnsignedBody(), facilitatorPubkey: FACILITATOR_PUBKEY };
    const out = canonicalizeReceipt(body);
    const parsed = JSON.parse(out);
    expect(Object.keys(parsed)).toEqual([...Object.keys(parsed)].sort());
  });

  it('excludes signature field even when present', () => {
    const signed = {
      ...makeUnsignedBody(),
      facilitatorPubkey: FACILITATOR_PUBKEY,
      signature: '0xfeedfeed',
    } as unknown as CrawlPayReceipt;
    const out = canonicalizeReceipt(signed);
    expect(out).not.toContain('signature');
    expect(out).not.toContain('feedfeed');
  });

  it('excludes undefined optional fields', () => {
    const body: CrawlPayReceiptBody = {
      ...makeUnsignedBody(),
      facilitatorPubkey: FACILITATOR_PUBKEY,
      batchId: undefined,
      onchainTxHash: undefined,
    };
    const out = canonicalizeReceipt(body);
    expect(out).not.toContain('batchId');
    expect(out).not.toContain('onchainTxHash');
  });

  it('is deterministic across calls', () => {
    const body: CrawlPayReceiptBody = { ...makeUnsignedBody(), facilitatorPubkey: FACILITATOR_PUBKEY };
    expect(canonicalizeReceipt(body)).toBe(canonicalizeReceipt(body));
  });
});

describe('hashReceiptBody', () => {
  it('produces a 32-byte hex hash', () => {
    const body: CrawlPayReceiptBody = { ...makeUnsignedBody(), facilitatorPubkey: FACILITATOR_PUBKEY };
    expect(hashReceiptBody(body)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('changes when any field changes', () => {
    const a: CrawlPayReceiptBody = { ...makeUnsignedBody(), facilitatorPubkey: FACILITATOR_PUBKEY };
    const b: CrawlPayReceiptBody = { ...a, amount: '200' };
    expect(hashReceiptBody(a)).not.toBe(hashReceiptBody(b));
  });
});

describe('signReceipt + verifyReceipt round-trip', () => {
  it('verifies a freshly-signed receipt', async () => {
    const signer = new PrivateKeyReceiptSigner(generatePrivateKey());
    const signed = await signReceipt(makeUnsignedBody(), signer);

    expect(signed.facilitatorPubkey.toLowerCase()).toBe(signer.address.toLowerCase());
    expect(signed.signature).toMatch(/^0x[0-9a-f]+$/);

    const result = await verifyReceipt(signed);
    expect(result.valid).toBe(true);
    expect(result.recoveredAddress.toLowerCase()).toBe(signer.address.toLowerCase());
  });

  it('rejects a receipt with a tampered field', async () => {
    const signer = new PrivateKeyReceiptSigner(generatePrivateKey());
    const signed = await signReceipt(makeUnsignedBody(), signer);

    const tampered: CrawlPayReceipt = { ...signed, amount: '999999' };
    const result = await verifyReceipt(tampered);
    expect(result.valid).toBe(false);
  });

  it('rejects when expectedSigner does not match', async () => {
    const signer = new PrivateKeyReceiptSigner(generatePrivateKey());
    const signed = await signReceipt(makeUnsignedBody(), signer);

    const otherAddr = '0x9999999999999999999999999999999999999999' as Address;
    const result = await verifyReceipt(signed, otherAddr);
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/expected signer/);
  });

  it('two signers produce different recoverable signatures over the same body', async () => {
    const a = new PrivateKeyReceiptSigner(generatePrivateKey());
    const b = new PrivateKeyReceiptSigner(generatePrivateKey());
    const ra = await signReceipt(makeUnsignedBody(), a);
    const rb = await signReceipt(makeUnsignedBody(), b);
    expect(ra.signature).not.toBe(rb.signature);
    expect(ra.facilitatorPubkey).not.toBe(rb.facilitatorPubkey);
    expect((await verifyReceipt(ra)).valid).toBe(true);
    expect((await verifyReceipt(rb)).valid).toBe(true);
  });
});
