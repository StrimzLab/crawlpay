import type { Address } from './primitives';
import type { AtomicUsdc } from './primitives';

export interface CrawlerProfile {
  walletAddress: Address;
  erc8004AgentId?: string;
  userAgent?: string;
  /** Hard cap on per-request payment, regardless of publisher offer. */
  maxPerRequest: AtomicUsdc;
  /** Daily spending budget across all publishers. */
  dailyBudget?: AtomicUsdc;
  active: boolean;
}

export interface CrawlerBudgetState {
  /** YYYY-MM-DD in UTC. */
  date: string;
  spentAtomic: AtomicUsdc;
  remainingAtomic: AtomicUsdc;
}
