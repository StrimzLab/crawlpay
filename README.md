# CrawlPay

> Open infrastructure for pay-per-crawl on the web. Publishers charge AI crawlers per URL. Crawlers pay per request via Circle Nanopayments, settled on Arc.

**Status:** Pre-alpha. Building for the [Agentic Economy on Arc hackathon](https://lablab.ai/ai-hackathons/nano-payments-arc) (April 20–26, 2026).

---

## What CrawlPay is

The open, developer-first alternative to Cloudflare's Pay-Per-Crawl. Any publisher — regardless of CDN — can monetize AI crawler traffic. Any AI crawler can pay per URL fetched, with cryptographic receipts as proof of legitimate access.

- **Publishers** drop in a middleware (Node/Python/Go) or point DNS at our hosted proxy → start charging $0.0001–$0.01 per page, paid in USDC on Arc.
- **Crawlers** install `@crawlpay/sdk` → auto-pay for any CrawlPay-enabled URL, configurable budget caps, ERC-8004 reputation filtering.
- **Receipts** are cryptographically signed proofs that a crawler paid for a specific URL at a specific time. Portable across services. Audit-ready.

## Why it's different from Cloudflare Pay-Per-Crawl

| | Cloudflare PPC | CrawlPay |
|---|---|---|
| Requires being on Cloudflare | Yes | No |
| Settlement | Daily batched, credit card | Per-request, USDC on Arc |
| Proprietary | Yes | Open-source |
| Agent reputation | No | ERC-8004 integration |
| Portable receipts | No | Yes, signed + on-chain verifiable |

## Architecture

\`\`\`
┌─────────────────┐        ┌─────────────────────┐        ┌──────────────────┐
│  AI Crawler     │───────▶│  Publisher Site     │───────▶│  CrawlPay        │
│  + SDK          │  GET   │  + CrawlPay MW      │  402   │  Facilitator     │
└─────────────────┘        └─────────────────────┘        │  (Nanopayments)  │
        │                             ▲                   │                  │
        │       X-PAYMENT header      │                   └────────┬─────────┘
        └─────────────────────────────┘                            │
                                                                   │ batch
                                                                   ▼
                                                          ┌─────────────────┐
                                                          │  Arc L1         │
                                                          │  USDC + ERC-8004│
                                                          └─────────────────┘
\`\`\`

## Hackathon scope (Apr 20–26)

- [x] Repo scaffold
- [ ] x402 facilitator against Circle Nanopayments (testnet)
- [ ] Publisher middleware for Express
- [ ] Crawler TypeScript SDK
- [ ] Minimal web dashboard (publisher earnings + crawler spend)
- [ ] Seed 5 mock publishers
- [ ] Demo script: one agent crawls 50+ pages across 5 publishers
- [ ] Arcscan-verified transaction log
- [ ] Demo video + submission

## Post-hackathon roadmap

- Python & Go middleware
- Ghost / WordPress / Substack plugins
- Hosted proxy for non-technical publishers (DNS-based)
- Full ERC-8004 reputation system
- Mainnet launch

## Local development

\`\`\`bash
pnpm install
cp .env.example .env   # fill in Circle API keys, Arc RPC
pnpm dev               # runs all apps in parallel
\`\`\`

## License

BUSL-1.1 (converts to Apache 2.0 after 3 years).

## Built with

- **[Arc](https://arc.network)** — settlement layer
- **[Circle Nanopayments](https://circle.com/nanopayments)** — gas-free USDC
- **[x402](https://x402.org)** — HTTP-native payment protocol
- **[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)** — agent reputation
- **[Circle Wallets](https://developers.circle.com/wallets)** — crawler wallet infra