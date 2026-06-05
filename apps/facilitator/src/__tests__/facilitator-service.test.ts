import { describe, expect, it } from 'vitest';
import { generatePrivateKey } from 'viem/accounts';
import type { Address, Hex } from 'viem';
import { PrivateKeyReceiptSigner, verifyReceipt } from '@crawlpay/receipt-signer';
import type { PaymentPayload, PaymentRequirement } from '@crawlpay/types';
import type { CircleFacilitator, SettleResult } from '../services/circle-facilitator';
import { FacilitatorService } from '../services/facilitator-service';
import { MemoryNonceTracker } from '../services/nonce-tracker';
import { MemoryReceiptRepository } from '../services/receipt-repository';

const PUBLISHER = '0x1111111111111111111111111111111111111111' as Address;
const CRAWLER = '0x2222222222222222222222222222222222222222' as Address;
const VERIFYING_CONTRACT = '0x0077777d7eba4688bdef3e311b846f25870a19b9' as Address;

class FakeFacilitator implements CircleFacilitator {
  settleResult: SettleResult = {
    success: true,
    payer: CRAWLER,
    transaction: 'fake-uuid',
    network: 'eip155:5042002',
  };
  settleImpl: (() => Promise<SettleResult>) | null = null;

  async settle(): Promise<SettleResult> {
    if (this.settleImpl) return this.settleImpl();
    return this.settleResult;
  }

  async getVerifyingContract(): Promise<Address | null> {
    return VERIFYING_CONTRACT;
  }
}

function nonceFromSuffix(suffix: string): Hex {
  const hex = suffix.padStart(64, '0');
  return `0x${hex}` as Hex;
}

function makeInput(nonceSuffix = '1') {
  const nonce = nonceFromSuffix(nonceSuffix);
  const validBefore = String(Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60);
  const paymentPayload: PaymentPayload = {
    x402Version: 2,
    scheme: 'exact',
    network: 'eip155:5042002',
    payload: {
      authorization: {
        from: CRAWLER,
        to: PUBLISHER,
        value: '100',
        validAfter: '0',
        validBefore,
        nonce,
      },
      signature: '0xfeed' as Hex,
    },
  };
  const paymentRequirements: PaymentRequirement = {
    scheme: 'exact',
    network: 'eip155:5042002',
    amount: '100',
    payTo: PUBLISHER,
    asset: '0x3600000000000000000000000000000000000000' as Address,
    maxTimeoutSeconds: 7 * 24 * 60 * 60,
    extra: {
      name: 'GatewayWalletBatched',
      version: '1',
      verifyingContract: VERIFYING_CONTRACT,
    },
  };
  return {
    publisherId: 'pub_abc',
    publisherWallet: PUBLISHER,
    url: 'https://example.com/articles/foo',
    paymentPayload,
    paymentRequirements,
  };
}

function makeService(opts: { facilitator?: FakeFacilitator } = {}) {
  const facilitator = opts.facilitator ?? new FakeFacilitator();
  const signer = new PrivateKeyReceiptSigner(generatePrivateKey());
  const nonces = new MemoryNonceTracker();
  const receipts = new MemoryReceiptRepository();
  const service = new FacilitatorService({
    facilitator,
    signer,
    nonces,
    receipts,
    network: 'arcTestnet',
  });
  return { service, signer, nonces, receipts, facilitator };
}

describe('FacilitatorService.verify', () => {
  it('returns a signed verifiable receipt on settlement success', async () => {
    const { service, signer, receipts } = makeService();
    const result = await service.verify(makeInput('1'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.receipt.publisherId).toBe('pub_abc');
    expect(result.data.receipt.publisherWallet).toBe(PUBLISHER);
    expect(result.data.receipt.crawlerWallet).toBe(CRAWLER);
    expect(result.data.receipt.amount).toBe('100');
    expect(result.data.receipt.network).toBe('arcTestnet');
    expect(result.data.receipt.facilitatorPubkey.toLowerCase()).toBe(
      signer.address.toLowerCase(),
    );
    expect(result.data.settlement.transaction).toBe('fake-uuid');
    expect(result.data.settlement.payer).toBe(CRAWLER);

    const v = await verifyReceipt(result.data.receipt);
    expect(v.valid).toBe(true);

    const stored = await receipts.getByNonce(result.data.receipt.authorizationNonce);
    expect(stored).toEqual(result.data.receipt);
  });

  it('rejects a replayed nonce', async () => {
    const { service } = makeService();
    const input = makeInput('2');

    const first = await service.verify(input);
    expect(first.ok).toBe(true);

    const second = await service.verify(input);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('replay');
    }
  });

  it('propagates Circle error codes into the response', async () => {
    const fake = new FakeFacilitator();
    fake.settleResult = { success: false, errorReason: 'insufficient_balance' };
    const { service } = makeService({ facilitator: fake });

    const result = await service.verify(makeInput('3'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('insufficient_balance');
    }
  });

  it('wraps facilitator throws as facilitator_error', async () => {
    const fake = new FakeFacilitator();
    fake.settleImpl = async () => {
      throw new Error('Circle returned 503');
    };
    const { service } = makeService({ facilitator: fake });

    const result = await service.verify(makeInput('4'));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('facilitator_error');
      expect(result.error.message).toContain('503');
    }
  });

  it('does NOT release a reserved nonce on settle failure (replay barrier intact)', async () => {
    const fake = new FakeFacilitator();
    fake.settleResult = { success: false, errorReason: 'insufficient_balance' };
    const { service, nonces } = makeService({ facilitator: fake });
    const input = makeInput('5');

    const first = await service.verify(input);
    expect(first.ok).toBe(false);

    expect(await nonces.isUsed(input.paymentPayload.payload.authorization.nonce)).toBe(true);

    const second = await service.verify(input);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error.code).toBe('replay');
    }
  });
});

describe('FacilitatorService.verifyReceiptSignature', () => {
  it('verifies a receipt the service itself issued', async () => {
    const { service, signer } = makeService();
    const result = await service.verify(makeInput('6'));
    if (!result.ok) throw new Error('verify failed');

    const v = await service.verifyReceiptSignature(result.data.receipt, signer.address);
    expect(v.valid).toBe(true);
  });

  it('rejects a receipt with a tampered field', async () => {
    const { service } = makeService();
    const result = await service.verify(makeInput('7'));
    if (!result.ok) throw new Error('verify failed');

    const tampered = { ...result.data.receipt, amount: '999999' };
    const v = await service.verifyReceiptSignature(tampered);
    expect(v.valid).toBe(false);
  });
});
