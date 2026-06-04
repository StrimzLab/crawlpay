import type { Address, Hex } from 'viem';

export type { Address, Hex };

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * USDC in atomic units. USDC has 6 decimal places:
 *   1_000_000n  = $1.00
 *   100_000n    = $0.10
 *   100n        = $0.0001
 */
export type AtomicUsdc = Brand<bigint, 'AtomicUsdc'>;

const USDC_DECIMALS = 6;
const USDC_SCALE = 1_000_000n;

export function atomicUsdc(value: bigint | number | string): AtomicUsdc {
  const b = typeof value === 'bigint' ? value : BigInt(value);
  if (b < 0n) throw new RangeError(`AtomicUsdc cannot be negative: ${b}`);
  return b as AtomicUsdc;
}

export function dollarsToAtomic(dollars: string): AtomicUsdc {
  const s = dollars.startsWith('$') ? dollars.slice(1) : dollars;
  if (!/^\d+(\.\d+)?$/.test(s)) {
    throw new TypeError(`Invalid dollar amount: ${dollars}`);
  }
  const [whole = '0', fraction = ''] = s.split('.');
  if (fraction.length > USDC_DECIMALS) {
    throw new RangeError(
      `USDC supports at most ${USDC_DECIMALS} decimal places; got ${fraction.length} in "${dollars}"`,
    );
  }
  const padded = (fraction + '0'.repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  return atomicUsdc(BigInt(whole) * USDC_SCALE + BigInt(padded));
}

export function atomicToDollars(atomic: AtomicUsdc): string {
  const whole = atomic / USDC_SCALE;
  const fraction = atomic % USDC_SCALE;
  if (fraction === 0n) return whole.toString();
  const fStr = fraction.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '');
  return `${whole}.${fStr}`;
}

/**
 * Supported Circle Gateway networks. Matches Circle's `SupportedChainName`.
 * Add new entries as we expand beyond Arc Testnet.
 */
export type Network = 'arcTestnet';

export const NETWORKS = ['arcTestnet'] as const satisfies readonly Network[];

/** CAIP-2 network identifier (used in x402 PaymentRequirement.network). */
export type Caip2Network = `eip155:${string}`;

export const NETWORK_TO_CAIP2: Record<Network, Caip2Network> = {
  arcTestnet: 'eip155:5042002',
};

export const NETWORK_TO_CHAIN_ID: Record<Network, number> = {
  arcTestnet: 5042002,
};

/**
 * Circle Gateway facilitator API endpoints.
 *
 * The Circle SDK defaults to the mainnet URL for both `BatchFacilitatorClient`
 * and `createGatewayMiddleware`. Talking to mainnet from a testnet client
 * results in `"No payment networks available"` because mainnet's supported
 * list doesn't include testnet chains.
 *
 * Source: dist/server/index.d.ts (@circle-fin/x402-batching@3.x).
 */
export const CIRCLE_GATEWAY_API_URL = {
  mainnet: 'https://gateway-api.circle.com',
  testnet: 'https://gateway-api-testnet.circle.com',
} as const;

/** Map a CrawlPay Network to the Circle Gateway API base URL it lives behind. */
export const NETWORK_TO_GATEWAY_API_URL: Record<Network, string> = {
  arcTestnet: CIRCLE_GATEWAY_API_URL.testnet,
};
