import type { Address } from './primitives';
import type { AtomicUsdc, Network } from './primitives';

export interface PublisherConfig {
  id: string;
  domain: string;
  walletAddress: Address;
  erc8004AgentId?: string;
  defaultPriceAtomic: AtomicUsdc;
  pricingRules?: PricingRule[];
  accessRules?: AccessRule[];
  minReputationScore?: number;
  robotsTxtAware?: boolean;
  active: boolean;
  network: Network;
}

export interface PricingRule {
  /** Glob pattern, evaluated in declaration order; first match wins. */
  pattern: string;
  priceAtomic: AtomicUsdc;
  scheme: 'per-request' | 'per-kb';
}

export interface AccessRule {
  type: 'allow' | 'block' | 'discount';
  crawlerWallet?: Address;
  minReputationScore?: number;
  maxReputationScore?: number;
  /** Discount in basis points (0–10000). */
  discountBps?: number;
}
