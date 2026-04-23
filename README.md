# CrawlPay

[![License: BUSL 1.1](https://img.shields.io/badge/license-BUSL--1.1-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Hackathon](https://img.shields.io/badge/Agentic%20Economy%20on%20Arc-Apr%2020--26-ff6b35)](https://lablab.ai/ai-hackathons/nano-payments-arc)

[![Built on Arc](https://img.shields.io/badge/Built%20on-Arc-000000)](https://arc.network)
[![Circle Nanopayments](https://img.shields.io/badge/Circle-Nanopayments-29B6F6)](https://circle.com/nanopayments)
[![USDC](https://img.shields.io/badge/Settled%20in-USDC-2775CA)](https://www.circle.com/usdc)
[![x402](https://img.shields.io/badge/Protocol-x402-6c47ff)](https://x402.org)
[![EIP-3009](https://img.shields.io/badge/EIP--3009-signed%20authorizations-627EEA)](https://eips.ethereum.org/EIPS/eip-3009)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-agent%20reputation-8247e5)](https://eips.ethereum.org/EIPS/eip-8004)

**Pay-per-crawl infrastructure for the open web.**

Publishers charge AI crawlers per page. Crawlers pay in USDC per request and receive a signed receipt as proof they accessed the content legitimately. Payments are aggregated off-chain by [Circle Nanopayments](https://circle.com/nanopayments) and finalized on [Arc](https://arc.network).

[Architecture](./docs/architecture.md) · [Protocol](./docs/protocol.md) · [Publisher Guide](./docs/publishers.md) · [Crawler Guide](./docs/crawlers.md) · [Contributing](./CONTRIBUTING.md)

---

## Overview

CrawlPay is a protocol and a working implementation for charging AI agents to access web content. It is built on three open standards:

- **[x402](https://x402.org)** — the HTTP-native payment standard that uses the long-dormant `402 Payment Required` status code
- **[EIP-3009](https://eips.ethereum.org/EIPS/eip-3009)** — enables gasless USDC transfers via off-chain signatures.
- **[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)** — a standard for agent identity and reputation

The problem CrawlPay exists to solve is simple. A human reads a few pages a day. An AI crawler reads hundreds of thousands. At that scale, flat subscriptions either overcharge small users or undercharge heavy ones, and blocking crawlers outright leaves money on the table for publishers and kills access for crawlers that would happily pay. CrawlPay replaces both with per-request pricing as small as a fraction of a cent, settled continuously in the background.

## Design principles

1. **HTTP-native.** A CrawlPay-protected URL looks like any other URL. A client that doesn't want to pay gets a standard `402 Payment Required` response with a machine-readable payment offer. There is no new protocol to learn and no client-side handshake beyond a signed header.
2. **Publisher sovereignty.** Publishers set their own prices, decide which crawlers can access their content, and choose where payouts go. CrawlPay never holds publisher funds beyond the short window Circle needs to batch payments.
3. **Portable receipts.** Every paid fetch produces a cryptographically signed receipt. The receipt is valid proof of access anywhere (in an audit, in court, in a reputation system), not just inside CrawlPay.
4. **Minimal trust surface.** A publisher can self-host the full stack. The hosted version of CrawlPay is a convenience, not a requirement.

## System architecture

CrawlPay is made up of three services you run and two shared libraries you import.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                              Data plane                                    │
│                                                                            │
│  ┌───────────┐  HTTP GET   ┌──────────────────┐   POST /verify             │
│  │  Crawler  │────────────▶│  Publisher site  │──────────────┐             │
│  │  + SDK    │             │  + middleware    │              │             │
│  └─────┬─────┘ 402 + offer └────────┬─────────┘              ▼             │
│        │                            │                ┌───────────────┐     │
│        │     X-PAYMENT (EIP-3009)   │                │  Facilitator  │     │
│        └────────────────────────────┘                │  (x402 +      │     │
│                                     ▲                │   Nanopymnts) │     │
│                                     │                └───────┬───────┘     │
│                                     │  content +             │             │
│                                     │  X-PAYMENT-RESPONSE    │             │
│                                     └────────────────────────┘             │
└────────────────────────────────────────────────────────────────────────────┘
                                                                │
                                                                │ signed auth
                                                                ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                            Settlement plane                                │
│                                                                            │
│   Circle Nanopayments  ── aggregates offchain ──▶  batch submit            │
│                                                       │                    │
│                                                       ▼                    │
│                                            Arc L1 (EVM, USDC gas)          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                             Control plane                                  │
│                                                                            │
│   ┌────────────────┐     ┌─────────────────────┐    ┌────────────────┐     │
│   │  API gateway   │◀────│  Web dashboard      │───▶│  ERC-8004      │     │
│   │  (catalog,     │     │  (publishers +      │    │  (Identity +   │     │
│   │   receipts,    │     │   crawlers)         │    │   Reputation)  │     │
│   │   analytics)   │     │                     │    │                │     │
│   └────────────────┘     └─────────────────────┘    └────────────────┘     │
└────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Role | Stack |
|---|---|---|
| `apps/facilitator` | Verifies payment signatures, submits them to Circle Nanopayments, and issues signed receipts. This is the hot path — everything routes through here. | Fastify, viem, Circle SDK |
| `apps/api-gateway` | Read-only API for receipts, analytics, and the publisher catalog. Fires webhooks. | Go, Gin, Postgres |
| `apps/web-dashboard` | Dashboard where publishers see their earnings and crawlers see their spend. | Next.js, TanStack Query |
| `packages/proxy-middleware` | Drop-in middleware for Express, Fastify, or Next.js. Sends `402` responses and forwards payments to the facilitator. | TypeScript |
| `packages/crawler-sdk` | SDK that crawlers install. Intercepts HTTP requests, signs payment authorizations, handles retries, stores receipts. | TypeScript |
| `packages/receipt-signer` | The library that signs and verifies receipts. Used by the facilitator (to sign) and by the dashboard and auditors (to verify). | TypeScript |
| `packages/types` | Shared TypeScript types. Every package imports from here. | TypeScript |
| `contracts` | On-chain helpers for registering publishers and crawlers in ERC-8004 registries. | Solidity, Foundry |

## Protocol flow

A single paid crawl has five steps.

### 1. Discovery

The crawler makes a normal HTTP request, with no payment header:

```http
GET /articles/how-circle-built-arc HTTP/1.1
Host: example-publisher.com
User-Agent: ExampleBot/1.0
```

### 2. Payment offer

The publisher's middleware looks at the User-Agent, reverse DNS, and IP reputation. If it decides this is a crawler and not a human, it responds with an x402 payment requirement:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "arc-testnet",
    "maxAmountRequired": "100",
    "resource": "https://example-publisher.com/articles/...",
    "payTo": "0xPublisher...",
    "asset": "0x3600000000000000000000000000000000000000",
    "maxTimeoutSeconds": 30,
    "extra": {
      "name": "USDC",
      "version": "2",
      "crawlpay_publisher_id": "pub_abc123"
    }
  }]
}
```

`maxAmountRequired` is in USDC atomic units. USDC has 6 decimals, so `100` means $0.0001.

### 3. Signed authorization

The crawler builds an [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009) `TransferWithAuthorization` message, signs it with its wallet key (or through [EIP-1271](https://eips.ethereum.org/EIPS/eip-1271) for smart contract accounts), and retries the request:

```http
GET /articles/how-circle-built-arc HTTP/1.1
Host: example-publisher.com
X-PAYMENT: eyJhdXRob3JpemF0aW9uIjp7ImZyb20iOiIweC4uLiJ9LCJzaWduYXR1cmUiOiIweC4uLiJ9
```

The `X-PAYMENT` header is a base64-encoded JSON object containing the signed authorization and scheme metadata.

### 4. Verification and settlement

The publisher's middleware forwards the authorization to the facilitator at `POST /verify`. The facilitator then:

1. Recovers the signer address from the EIP-712 typed-data signature
2. Checks `from`, `to`, `value`, `validAfter`, `validBefore`, and `nonce`
3. Submits the authorization to Circle Nanopayments for off-chain aggregation
4. Issues a signed `CrawlPayReceipt`

Circle Nanopayments batches thousands of these authorizations off-chain and settles them on Arc in a single on-chain transaction every few minutes. The publisher gets instant confirmation from the facilitator; final on-chain settlement happens in the background.

### 5. Content delivery

The middleware returns the page with a receipt in the response header:

```http
HTTP/1.1 200 OK
X-PAYMENT-RESPONSE: eyJyZWNlaXB0Ijp7InZlcnNpb24iOiIxIi4uLn0sInNpZ25hdHVyZSI6IjB4Li4uIn0=
Content-Type: text/html

<!DOCTYPE html>
...
```

## Receipt model

Every paid fetch produces a `CrawlPayReceipt`:

```typescript
interface CrawlPayReceipt {
  version: '1';
  publisherId: string;
  publisherWallet: `0x${string}`;
  crawlerWallet: `0x${string}`;
  crawlerAgentId?: string;        // ERC-8004 agent NFT id
  url: string;
  urlHash: `0x${string}`;         // sha256(url || '\n' || timestamp)
  amount: string;                 // atomic USDC
  currency: 'USDC';
  network: string;                // 'arc-mainnet' | 'arc-testnet'
  authorizationNonce: `0x${string}`;
  timestamp: number;
  batchId?: string;               // set after Nanopayments batches
  onchainTxHash?: `0x${string}`;  // set after Arc settlement
  signature: `0x${string}`;       // facilitator's signature over the fields above
}
```

Receipts are permanent cryptographic evidence. Someone who has only the receipt, the facilitator's public key, and a connection to an Arc RPC node can verify on their own that a specific crawler paid a specific amount for a specific URL at a specific time. No access to CrawlPay's database required.

## Versioning

### v0 (current) — hackathon MVP

- One facilitator, hosted by CrawlPay
- Express middleware only
- TypeScript crawler SDK only
- Testnet only (Arc testnet + Circle Nanopayments testnet)
- No ERC-8004 yet; flat per-publisher pricing
- Postgres-backed receipt store
- Demo dashboard

### v1 — public beta

- Python and Go middleware in addition to Node
- Self-hostable facilitator (Docker image + Helm chart)
- ERC-8004 Identity Registry support for publishers and crawlers
- Pricing tiers: per-URL patterns, bulk discounts, reputation-based rates
- Receipt exports (CSV, JSON) for accounting
- Plugins for Ghost, WordPress, and Substack
- Mainnet launch on Arc

### v2 — reputation and discovery

- ERC-8004 Reputation Registry scoring for publishers (uptime, reliability) and crawlers (payment history, robots.txt compliance)
- Discovery API for crawlers to find publishers by topic, price range, and reputation
- Validator network that attests to content authenticity through the ERC-8004 Validation Registry
- Pooled pricing for groups of publishers using multi-sig payout contracts

### v3 — cross-chain and deferred

- Deferred payment scheme (per x402 v2) for trusted crawler relationships that want daily settlement instead of per-request
- Cross-chain settlement through Circle CCTP for publishers who prefer payouts on Base or Ethereum
- Streaming subscriptions as an alternative to per-request, for premium crawler partnerships

## Trust model

CrawlPay is not fully trustless and does not claim to be. The trust assumptions by component are:

| Component | What you trust | How it's bounded |
|---|---|---|
| Circle Nanopayments | Circle holds batched funds during the short off-chain aggregation window | Same trust model as holding USDC; funds are not rehypothecated and are held in a TEE-backed custody setup |
| Facilitator signature | You trust receipts signed by known facilitator keys | There is a public registry of facilitator keys, and publishers can run their own facilitator |
| Publisher bot classification | Heuristics are imperfect; humans can be misclassified as crawlers and vice versa | Configurable per publisher; optional proof-of-personhood for edge cases |
| Arc consensus | Sub-second finality, permissioned validator set | Matches the commercial, compliance-heavy nature of publisher–crawler transactions |

## Security considerations

- **Replay protection.** Every EIP-3009 authorization carries a 32-byte nonce. The USDC contract enforces single-use through its `authorizationState` mapping. The facilitator tracks nonces too, rejecting replays before they hit the chain.
- **Double-charging.** If a middleware forwarded the same authorization to two facilitators in parallel, only one would win — Circle Nanopayments rejects the second on the shared nonce.
- **Signature stripping.** Receipts are signed over a canonical JSON form with fixed field ordering. Any mutation invalidates the signature. Verifiers reject unknown fields.
- **Facilitator compromise.** A compromised facilitator could issue fake receipts but cannot move anyone's funds — Nanopayments authorizations only route value to the publisher wallet specified in the original offer. It cannot replay on-chain.

## Repository layout

```
crawlpay/
├── apps/
│   ├── facilitator/           x402 verification + Nanopayments submission
│   ├── api-gateway/           Receipts, analytics, catalog REST API
│   └── web-dashboard/         Next.js dashboard
├── packages/
│   ├── types/                 Shared protocol types
│   ├── receipt-signer/        Receipt sign and verify library
│   ├── proxy-middleware/      Publisher middleware (Express, Fastify, Next)
│   └── crawler-sdk/           Crawler SDK
├── contracts/                 ERC-8004 helpers (Foundry)
├── infra/                     Docker Compose, Helm charts
├── scripts/                   Seed data, demo runners, benchmarks
└── docs/                      Architecture, protocol, operator guides
```

## Local development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Services:
- Facilitator: `http://localhost:3001`
- API gateway: `http://localhost:8080`
- Dashboard: `http://localhost:3000`

See [`docs/development.md`](./docs/development.md) for the full setup, including Circle sandbox credentials and Arc testnet faucets.

## Contributing

Contributions welcome. Any non-trivial change should start as a GitHub issue first. See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the PR workflow, coding standards, and commit message conventions.

## License

Business Source License 1.1 (BUSL-1.1). Converts to Apache 2.0 on 2029-04-22. Read the full text in [`LICENSE`](./LICENSE). In plain terms: self-hosting is free forever; running CrawlPay as a paid service for other people requires a license until the change date.

## References

- x402 specification — https://x402.org
- Circle Nanopayments — https://circle.com/nanopayments
- Arc documentation — https://docs.arc.network
- ERC-8004 specification — https://eips.ethereum.org/EIPS/eip-8004
- EIP-3009 specification — https://eips.ethereum.org/EIPS/eip-3009