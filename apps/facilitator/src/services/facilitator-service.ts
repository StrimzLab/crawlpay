import { sha256, toHex, type Address, type Hex } from 'viem';
import {
  signReceipt,
  verifyReceipt,
  type ReceiptSigner,
  type VerificationResult,
} from '@crawlpay/receipt-signer';
import {
  atomicUsdc,
  type AtomicUsdc,
  type CrawlPayErrorCode,
  type CrawlPayReceipt,
  type CrawlPayReceiptBody,
  type Network,
  type PaymentPayload,
  type PaymentRequirement,
} from '@crawlpay/types';
import type { CircleFacilitator } from './circle-facilitator';
import type { NonceTracker } from './nonce-tracker';
import type { ReceiptRepository } from './receipt-repository';

export interface VerifyInput {
  publisherId: string;
  publisherWallet: Address;
  url: string;
  paymentPayload: PaymentPayload;
  paymentRequirements: PaymentRequirement;
  crawlerAgentId?: string;
}

export interface VerifySuccess {
  ok: true;
  data: {
    receipt: CrawlPayReceipt;
    settlement: { transaction: string; payer: Address };
  };
}

export interface VerifyFailure {
  ok: false;
  error: { code: CrawlPayErrorCode; message: string };
}

export type VerifyResult = VerifySuccess | VerifyFailure;

/**
 * Core facilitator orchestration. Stateless per call — all state lives in the
 * injected NonceTracker / ReceiptRepository.
 *
 * verify() flow:
 *   1. Reserve the EIP-3009 nonce atomically (defends against replay)
 *   2. Settle via Circle Gateway
 *   3. On success: build + sign a CrawlPayReceipt
 *   4. Persist the receipt
 *   5. Return the signed receipt + Gateway settlement reference
 *
 * Reservation happens BEFORE settle so two concurrent requests for the same
 * nonce can't both reach Circle. We deliberately do NOT release the nonce
 * on settle failure — a failed settle still consumes the replay barrier
 * (Circle itself rejects duplicate nonces, and we don't want a buggy or
 * malicious client to retry-loop the same authorization).
 */
export class FacilitatorService {
  readonly #facilitator: CircleFacilitator;
  readonly #signer: ReceiptSigner;
  readonly #nonces: NonceTracker;
  readonly #receipts: ReceiptRepository;
  readonly #network: Network;

  constructor(deps: {
    facilitator: CircleFacilitator;
    signer: ReceiptSigner;
    nonces: NonceTracker;
    receipts: ReceiptRepository;
    network: Network;
  }) {
    this.#facilitator = deps.facilitator;
    this.#signer = deps.signer;
    this.#nonces = deps.nonces;
    this.#receipts = deps.receipts;
    this.#network = deps.network;
  }

  get signerAddress(): Address {
    return this.#signer.address;
  }

  get receiptsRepository(): ReceiptRepository {
    return this.#receipts;
  }

  async verify(input: VerifyInput): Promise<VerifyResult> {
    const auth = input.paymentPayload.payload.authorization;
    const nonce = auth.nonce;
    const validBefore = Number(auth.validBefore);

    const reserved = await this.#nonces.reserve(nonce, validBefore + 60);
    if (!reserved) {
      return { ok: false, error: { code: 'replay', message: `nonce ${nonce} already used` } };
    }

    let settlement;
    try {
      settlement = await this.#facilitator.settle(
        input.paymentPayload,
        input.paymentRequirements,
      );
    } catch (err) {
      return {
        ok: false,
        error: {
          code: 'facilitator_error',
          message: err instanceof Error ? err.message : String(err),
        },
      };
    }

    if (!settlement.success || !settlement.payer) {
      return {
        ok: false,
        error: {
          code: (settlement.errorReason as CrawlPayErrorCode | undefined) ?? 'unexpected_error',
          message: settlement.errorReason ?? 'settlement failed',
        },
      };
    }

    const amount = atomicUsdc(BigInt(input.paymentRequirements.amount));
    const receipt = await this.#issueReceipt({
      publisherId: input.publisherId,
      publisherWallet: input.publisherWallet,
      crawlerWallet: settlement.payer,
      url: input.url,
      amount,
      authorizationNonce: nonce,
      crawlerAgentId: input.crawlerAgentId,
    });

    await this.#receipts.insert(receipt);

    return {
      ok: true,
      data: {
        receipt,
        settlement: { transaction: settlement.transaction ?? '', payer: settlement.payer },
      },
    };
  }

  async verifyReceiptSignature(
    receipt: CrawlPayReceipt,
    expectedSigner?: Address,
  ): Promise<VerificationResult> {
    return verifyReceipt(receipt, expectedSigner);
  }

  async #issueReceipt(input: {
    publisherId: string;
    publisherWallet: Address;
    crawlerWallet: Address;
    url: string;
    amount: AtomicUsdc;
    authorizationNonce: Hex;
    crawlerAgentId?: string;
  }): Promise<CrawlPayReceipt> {
    const timestamp = Math.floor(Date.now() / 1000);
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
      network: this.#network,
      authorizationNonce: input.authorizationNonce,
      timestamp,
    };
    return signReceipt(body, this.#signer);
  }
}
