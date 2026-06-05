import { BatchEvmScheme } from '@circle-fin/x402-batching/client';
import { GatewayClient } from '@circle-fin/x402-batching/client';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';
import type {
  AtomicUsdc,
  Network,
  PaymentPayload,
  PaymentRequirement,
} from '@crawlpay/types';
import { atomicUsdc } from '@crawlpay/types';

export interface GatewayBalance {
  available: AtomicUsdc;
  total: AtomicUsdc;
}

export interface GatewayAdapter {
  /** The buyer's EOA address. */
  readonly address: Address;
  /** Sign an EIP-3009 authorization against the GatewayWallet domain. */
  createPaymentPayload(requirement: PaymentRequirement): Promise<PaymentPayload>;
  /** Read the buyer's Gateway balance. */
  getBalance(): Promise<GatewayBalance>;
  /** Deposit USDC into Gateway (one-time on-chain tx). */
  deposit(amountDollars: string): Promise<{ depositTxHash: Hex; amount: bigint }>;
}

/**
 * Default GatewayAdapter — wraps Circle's BatchEvmScheme (for signing) and
 * GatewayClient (for balance + deposit reads). Both are constructed once;
 * per-payment signing is cheap.
 */
export class CircleGatewayAdapter implements GatewayAdapter {
  readonly address: Address;
  readonly #scheme: BatchEvmScheme;
  readonly #client: GatewayClient;

  constructor(network: Network, privateKey: Hex) {
    const account = privateKeyToAccount(privateKey);
    this.address = account.address;
    this.#scheme = new BatchEvmScheme(account);
    this.#client = new GatewayClient({ chain: network, privateKey });
  }

  async createPaymentPayload(requirement: PaymentRequirement): Promise<PaymentPayload> {
    // BatchEvmScheme's PaymentRequirements type uses Record<string, unknown> for `extra`;
    // ours is structured. Runtime shape is identical — cast through unknown.
    const result = await this.#scheme.createPaymentPayload(
      2,
      requirement as unknown as Parameters<BatchEvmScheme['createPaymentPayload']>[1],
    );
    return {
      x402Version: 2,
      scheme: 'exact',
      network: requirement.network,
      payload: result.payload as PaymentPayload['payload'],
    };
  }

  async getBalance(): Promise<GatewayBalance> {
    const balances = await this.#client.getBalances();
    return {
      available: atomicUsdc(balances.gateway.available),
      total: atomicUsdc(balances.gateway.total),
    };
  }

  async deposit(amountDollars: string): Promise<{ depositTxHash: Hex; amount: bigint }> {
    const result = await this.#client.deposit(amountDollars);
    return { depositTxHash: result.depositTxHash, amount: result.amount };
  }
}
