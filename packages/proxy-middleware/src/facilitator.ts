import { BatchFacilitatorClient } from '@circle-fin/x402-batching/server';
import type { Address } from 'viem';
import {
  type Caip2Network,
  type Network,
  NETWORK_TO_GATEWAY_API_URL,
  type PaymentPayload,
  type PaymentRequirement,
} from '@crawlpay/types';

export interface FacilitatorSettleResult {
  success: boolean;
  payer?: Address;
  /** Gateway transfer UUID (resolves to an Arc tx hash later, after batching). */
  transaction?: string;
  errorReason?: string;
  network?: string;
}

/**
 * Pluggable facilitator interface.
 *
 * Decouples the middleware from any specific facilitator implementation, so
 * tests can substitute a mock and production can swap Circle's hosted
 * facilitator for a self-hosted instance.
 */
export interface FacilitatorAdapter {
  /**
   * Return the GatewayWallet contract address for the given CAIP-2 network,
   * or `null` if the network isn't supported. Used to populate
   * `PaymentRequirement.extra.verifyingContract` in 402 offers.
   */
  getVerifyingContract(network: Caip2Network): Promise<Address | null>;

  /** Submit a signed payment for verification + settlement. */
  settle(
    payload: PaymentPayload,
    requirements: PaymentRequirement,
  ): Promise<FacilitatorSettleResult>;
}

/**
 * Default FacilitatorAdapter backed by Circle's BatchFacilitatorClient.
 *
 * Caches the supported-networks list at first use so per-request 402 offers
 * don't re-fetch it. The cache is loaded lazily — construction is cheap.
 */
export class CircleGatewayFacilitator implements FacilitatorAdapter {
  readonly #client: BatchFacilitatorClient;
  #supportedCache: Promise<Map<string, Address>> | null = null;

  constructor(network: Network, url?: string) {
    this.#client = new BatchFacilitatorClient({
      url: url ?? NETWORK_TO_GATEWAY_API_URL[network],
    });
  }

  async getVerifyingContract(network: Caip2Network): Promise<Address | null> {
    if (!this.#supportedCache) {
      this.#supportedCache = this.#loadSupported();
    }
    const map = await this.#supportedCache;
    return map.get(network) ?? null;
  }

  async settle(
    payload: PaymentPayload,
    requirements: PaymentRequirement,
  ): Promise<FacilitatorSettleResult> {
    // The SDK's PaymentPayload uses Record<string, unknown> for `payload`;
    // our @crawlpay/types version is more specific. The runtime shape is
    // identical, so the cast is safe.
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
