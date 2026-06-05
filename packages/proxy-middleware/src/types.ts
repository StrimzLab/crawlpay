import type {
  Address,
  AtomicUsdc,
  CrawlPayReceipt,
  Network,
  PricingRule,
} from '@crawlpay/types';
import type { ReceiptSigner } from '@crawlpay/receipt-signer';
import type { BotClassifier, ClassificationResult } from './classifier';
import type { FacilitatorAdapter } from './facilitator';
import type { PricingResolver } from './pricing';

export interface CrawlPayMiddlewareConfig {
  /** Publisher catalog identifier (e.g. "pub_abc123"). */
  publisherId: string;
  /** Publisher's receiving wallet address. */
  publisherWallet: Address;
  /** Default per-request price when no pricing rule matches. */
  defaultPrice: AtomicUsdc;
  /** Per-path glob pricing rules. Evaluated in declaration order; first match wins. */
  pricingRules?: PricingRule[];
  /** Network the seller wants to be paid on. */
  network: Network;
  /** Signer used to issue CrawlPayReceipts. */
  receiptSigner: ReceiptSigner;
  /** Optional ERC-8004 agent ID; surfaced in the 402 offer. */
  erc8004AgentId?: string;
  /** Description shown in the 402 offer (e.g. "Premium research articles"). */
  description?: string;

  // ── Pluggable dependencies ─────────────────────────────────────
  /** Override the default heuristic bot classifier. */
  botClassifier?: BotClassifier;
  /** Override the default facilitator (Circle Gateway). */
  facilitator?: FacilitatorAdapter;
  /** Override the default pricing resolver (replaces pricingRules + defaultPrice). */
  pricingResolver?: PricingResolver;

  // ── Observability hooks ────────────────────────────────────────
  onPayment?: (event: PaymentEvent) => void | Promise<void>;
  onSkip?: (event: SkipEvent) => void | Promise<void>;
  onError?: (event: ErrorEvent) => void | Promise<void>;
}

export interface PaymentEvent {
  url: string;
  crawlerWallet: Address;
  amount: AtomicUsdc;
  receipt: CrawlPayReceipt;
  /** Gateway transfer UUID (not an on-chain tx hash — it lands later via batch). */
  settlementId: string;
  durationMs: number;
}

export interface SkipEvent {
  url: string;
  reason: 'human' | 'free-path';
  classification?: ClassificationResult;
}

export interface ErrorEvent {
  url: string;
  error: Error;
  phase: 'classify' | 'price' | 'verify' | 'settle' | 'sign-receipt';
}
