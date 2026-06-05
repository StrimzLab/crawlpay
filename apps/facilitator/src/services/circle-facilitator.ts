import { BatchFacilitatorClient } from '@circle-fin/x402-batching/server';
import type { Address } from 'viem';
import type { Caip2Network, PaymentPayload, PaymentRequirement } from '@crawlpay/types';

export interface SettleResult {
  success: boolean;
  payer?: Address;
  /** Gateway transfer UUID. Arc on-chain tx hash lands later via batch. */
  transaction?: string;
  errorReason?: string;
  network?: string;
}

/**
 * Pluggable Circle Gateway client interface. Tests substitute a fake; the
 * default adapter wraps Circle's BatchFacilitatorClient.
 */
export interface CircleFacilitator {
  settle(payload: PaymentPayload, requirements: PaymentRequirement): Promise<SettleResult>;
  /** GatewayWallet contract address for a CAIP-2 network. Cached internally. */
  getVerifyingContract(network: Caip2Network): Promise<Address | null>;
}

export class CircleFacilitatorAdapter implements CircleFacilitator {
  readonly #client: BatchFacilitatorClient;
  #supportedCache: Promise<Map<string, Address>> | null = null;

  constructor(gatewayApiUrl: string) {
    this.#client = new BatchFacilitatorClient({ url: gatewayApiUrl });
  }

  async settle(
    payload: PaymentPayload,
    requirements: PaymentRequirement,
  ): Promise<SettleResult> {
    const result = await this.#client.settle(
      payload as unknown as Parameters<BatchFacilitatorClient['settle']>[0],
      requirements as unknown as Parameters<BatchFacilitatorClient['settle']>[1],
    );
    return {
      success: result.success,
      payer: result.payer as Address | undefined,
      transaction: result.transaction,
      errorReason: result.errorReason,
      network: result.network,
    };
  }

  async getVerifyingContract(network: Caip2Network): Promise<Address | null> {
    if (!this.#supportedCache) {
      this.#supportedCache = this.#loadSupported();
    }
    const map = await this.#supportedCache;
    return map.get(network) ?? null;
  }

  async #loadSupported(): Promise<Map<string, Address>> {
    const supported = await this.#client.getSupported();
    const map = new Map<string, Address>();
    for (const kind of supported.kinds) {
      const extra = kind.extra as { verifyingContract?: string } | undefined;
      if (extra?.verifyingContract) {
        map.set(kind.network, extra.verifyingContract as Address);
      }
    }
    return map;
  }
}
