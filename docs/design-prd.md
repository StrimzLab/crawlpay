# CrawlPay — UI Design PRD

**Audience:** `claude design` (or equivalent UI generation agent)
**Output target:** Production-ready Next.js 15 web dashboard + marketing landing page, deployed at `apps/web-dashboard/`.
**Brand stance:** open, developer-first, agent-native crypto infrastructure for the AI-content economy.

This document is the complete brief. It contains brand context, page-by-page specs, component specs, real copy, live API contracts, and acceptance criteria. Do not improvise content — every code snippet, every label, every endpoint is authoritative.

---

## 0. One-paragraph context for the agent

CrawlPay is open-source pay-per-crawl infrastructure for the web. Publishers charge AI crawlers per URL they fetch. Crawlers pay in USDC (sub-cent amounts, gas-free) via Circle Gateway batched settlement on the Arc L1 blockchain. Every paid fetch produces a cryptographically signed receipt. CrawlPay is the open alternative to Cloudflare's private-beta Pay-Per-Crawl — the same capability, available to any publisher on any stack, with crypto-native settlement and portable receipts. The product is built on three open standards: **x402** (HTTP-native payment protocol), **EIP-3009** (off-chain USDC authorization), and **ERC-8004** (agent identity + reputation).

You are designing the web surface: a marketing landing page that converts, plus two role-specific dashboards (publisher + crawler) that show real earnings/spend, a live demo page used in hackathon judging, and a "why Arc" explainer.

---

## 1. Brand & positioning

### 1.1 What CrawlPay sounds like

- **Open, not closed.** We're not a SaaS — we're a protocol with a hosted convenience layer. Self-hosting is free forever (BUSL-1.1).
- **Crypto-native, but not crypto-bro.** USDC is the unit, Arc is the chain, but we talk about *payments* and *receipts*, not "rugs" or "moons."
- **Developer-first.** Code samples are the hero, not stock photos of people in headphones.
- **Pro-publisher and pro-crawler simultaneously.** Both sides need to feel the product was designed for them. No "us vs them" framing.
- **Confident about competitors.** Cloudflare did this in private beta for their customers. We did it openly for everyone. We don't insult them — we just point to the gap.

### 1.2 What CrawlPay does NOT sound like

- No "revolutionary," "disrupting," "Web 3.0 paradigm."
- No emojis in product copy. Sparingly in social/marketing (max 1 per section).
- No fake testimonials, no fake stats, no "10,000+ customers."
- No "schedule a demo" CTAs. We're self-serve.
- No NFT-style imagery (no glitchy gradients, no avatars-with-laser-eyes).

### 1.3 Visual references (rank-ordered by relevance)

Use these as the calibration for "what good looks like":

1. **vercel.com** — dark mode, generous whitespace, gradient mesh accents, gorgeous code blocks. Closest single reference.
2. **resend.com** — clean developer tool aesthetic, restrained color, beautiful pricing page.
3. **linear.app** — premium feel, monochrome with one accent, smooth transitions.
4. **cursor.com** — AI-native dev tool, friendly without being cute.
5. **stripe.com** — long single-page scroll, exceptional diagrams, transparent pricing math.
6. **anthropic.com** — sophisticated, restrained, monospace accents, lots of whitespace.

Anti-references (do NOT borrow from):
- Most "Web3" project sites (over-animated, glitchy, neon)
- Generic SaaS landing pages with stock illustrations
- Crypto exchange UIs (cluttered, ticker-heavy)

---

## 2. Design principles (treat as rules, not suggestions)

1. **Code is the hero.** Every page that explains *how* something works includes a code block. Code blocks have copy buttons, language badges, syntax highlighting.
2. **Numbers are typography.** When we show $0.0001, it deserves a hero treatment. Use monospace, large size, color accent.
3. **Real data, not mockups.** The demo page MUST hit our live API. The receipt feed MUST be real receipts. Faked numbers undermine trust.
4. **Dark mode is the default.** Light mode is a v1 toggle, not v0.
5. **One accent color, deployed surgically.** No rainbow. Accent only on: primary CTAs, key data points (amounts, counts), and one or two "wow" moments per page.
6. **Generous whitespace.** Padding ≥ 24px on cards, section gaps ≥ 96px on landing.
7. **Mobile is acceptable, not perfect.** Dashboards are desktop-first; landing must work on mobile.
8. **No skeleton loaders for boring data.** A receipt list of 4 rows can render instantly — don't add a 300ms shimmer for show.
9. **Trust signals are subtle.** "Built on Arc" badge is a small chip in the footer, not a hero banner.
10. **Empty states are designed.** "No receipts yet" gets a thoughtful illustration + a one-line next step, not blank space.

---

## 3. Visual system

### 3.1 Color palette

Dark mode (primary). Warm, editorial, deliberately distinct from the neon-and-cyan
aesthetic of most crypto/AI sites. Amber on deep teal-charcoal evokes a publisher's
reading lamp more than a trading dashboard — which is the brand we want.

```
--bg-base:         #0F141A   (slightly deeper than the brand surface, for hero contrast)
--bg-surface:      #151D25   (cards, panels — the brand base)
--bg-elevated:     #1C2632   (modals, dropdowns, code blocks)
--bg-overlay:      rgba(15, 20, 26, 0.82)

--border-subtle:   #232E3A
--border-strong:   #2F3D4A

--text-primary:    #F2EBE0   (warm off-white — complements the amber, never pure #FFF)
--text-secondary:  #A8A89E   (warm grey, derived from #8D8D85, slightly lifted)
--text-tertiary:   #6A6D6E
--text-disabled:   #3D4148

--accent:          #E8A96B   (warm amber — primary CTAs, key data, primary chart series,
                              "live" indicators. The single brand accent.)
--accent-hover:    #F2B97B
--accent-subtle:   rgba(232, 169, 107, 0.12)
--accent-glow:     rgba(232, 169, 107, 0.35)   (focus rings, hover halos)

--secondary:       #558A9F   (steel blue — secondary chart series, info chips, links
                              in dense UI. Never used as a CTA.)
--secondary-subtle: rgba(85, 138, 159, 0.12)

--success:         #8EB68A   (muted sage — harmonizes with the warm palette,
                              avoids the medicinal feel of pure green)
--warning:         #E8A96B   (same as accent — amber is already warning-coded)
--error:           #C77064   (warm muted red — derived from #88454F but lifted
                              into a more functional tone)
--info:            #558A9F   (same as secondary)

--gradient-hero:   radial-gradient(circle at 70% 80%,
                     rgba(232, 169, 107, 0.10) 0%,
                     rgba(232, 169, 107, 0.04) 30%,
                     transparent 60%)
                   layered over --bg-base. Subtle amber glow in the bottom-right
                   of the hero, never a full mesh, never decorative.
```

Light mode (deferred to v1, do not implement now):
- Same structure inverted. Base becomes `#F2EBE0` (warm cream), accent darkens to `#C8884A`.

Tailwind extension (commit to `tailwind.config.ts` so Tremor and component variants
can reference the brand colors by name):

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        // brand
        amber: { DEFAULT: '#E8A96B', hover: '#F2B97B' },   // used as Tremor's primary chart color
        steel: { DEFAULT: '#558A9F' },                      // secondary chart series
        // semantic
        sage:  { DEFAULT: '#8EB68A' },
        clay:  { DEFAULT: '#C77064' },                      // error
      },
    },
  },
};
```

### 3.2 Typography

- **Sans (body, UI):** `Geist Sans` (Vercel's font, free via Google Fonts). Fallback: Inter, system-ui.
- **Mono (code, numbers, addresses):** `Geist Mono`. Fallback: JetBrains Mono, ui-monospace.
- **Display (hero only):** Same Geist Sans, but at 64–96px with `font-weight: 600` and `letter-spacing: -0.04em`.

Scale:
```
--text-xs:    12px / 16px line-height
--text-sm:    14px / 20px
--text-base:  16px / 24px
--text-lg:    18px / 28px
--text-xl:    20px / 28px
--text-2xl:   24px / 32px   (h3)
--text-3xl:   32px / 40px   (h2)
--text-5xl:   48px / 56px   (h1 secondary pages)
--text-7xl:   72px / 80px   (landing hero)
```

Addresses always render in mono, truncated middle: `0x9D8e…f381`, with a copy button on hover.
Amounts in USDC always render in mono, e.g. `$0.0001 USDC` or `0.0001 USDC`.

### 3.3 Spacing & radius

8px base unit. Use multiples: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128.
Border radius: 6px (chips), 8px (buttons, inputs), 12px (cards), 16px (modals, code blocks).

### 3.4 Iconography

- **Library:** `lucide-react`.
- Stroke 1.5, never filled icons (with one exception: the "verified ✓" check on receipts).
- Icons sit at 16×16 in dense UI, 20×20 in primary nav, 24×24 in cards.

### 3.5 Motion

- **Library:** `framer-motion` (now sold as `motion/react`). Use it for any non-trivial animation — entrance, scroll reveal, layout transitions, gesture-driven micro-interactions.
- **CSS transitions** are enough for boring hover/focus on buttons, links, inputs. Don't reach for Framer for a `hover:bg-accent` change.
- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` (Vercel's "smooth"). In Framer: `[0.32, 0.72, 0, 1]` or named `"easeOut"` for casual cases.
- Duration: 150ms micro (hover, focus), 250ms state changes, 400ms page transitions, 600ms hero entrance.
- Spring for "alive" feel only: `{ type: 'spring', stiffness: 320, damping: 28 }`.
- **Reduced motion:** respect `prefers-reduced-motion`. Wrap variants with `useReducedMotion()` and collapse to zero-duration. See §18.6.

### 3.6 Charts

- **Library:** `@tremor/react` (https://tremor.so). Built on top of Recharts but with a high-level
  declarative API tuned for analytics dashboards. We use it for every chart in the product.
- Colors: pass `colors={['amber']}` (single series) or `colors={['amber', 'steel']}` (two series),
  referencing the brand colors we added to the Tailwind config in §3.1. Never use Tremor's default
  rainbow palette.
- `valueFormatter` is required on every chart — format atomic USDC into `$X.XXXX` via our
  `formatUsdc` helper.
- `showLegend={false}` for single-series charts. `showAnimation={true}` everywhere; Tremor's
  default duration is fine.
- Empty state (zero data): render the chart with a single zero-baseline series and overlay
  the empty-state component (§17.10) absolutely positioned over it. Don't show a blank axis.
- See §19 for chart-by-chart specs.

### 3.7 Component library

- **shadcn/ui** as the base (`pnpm dlx shadcn@latest add ...`).
- Install only what you use. Don't bloat the bundle.
- Customize colors via the CSS variables above — don't ship the default shadcn theme.

---

## 4. Tech stack (use exactly this)

- **Framework:** Next.js 15 (App Router, RSC where it makes sense).
- **Styling:** Tailwind CSS v4 + shadcn/ui.
- **Data fetching:** TanStack Query v5 for client; native `fetch()` in RSC.
- **Charts:** `@tremor/react` (uses Recharts under the hood).
- **Animation:** Framer Motion (`motion/react`).
- **Icons:** lucide-react.
- **Fonts:** `next/font` with Geist Sans + Geist Mono.
- **Forms:** react-hook-form + zod resolver (for the publisher onboarding wizard later).
- **Wallet connect (deferred to v1):** WalletConnect / Reown. For v0, just show wallet address from URL params.
- **API client:** thin wrapper around fetch in `lib/api.ts`. Base URL from `NEXT_PUBLIC_API_URL` env (default `http://localhost:8080`).

Package layout under `apps/web-dashboard/`:

```
apps/web-dashboard/
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json (extends ../../tsconfig.base.json)
├── public/
│   └── (favicon, og image, brand assets)
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                          // landing
│   │   ├── publisher/[id]/page.tsx
│   │   ├── publisher/[id]/receipts/page.tsx
│   │   ├── crawler/[wallet]/page.tsx
│   │   ├── crawler/[wallet]/receipts/page.tsx
│   │   ├── demo/page.tsx
│   │   ├── why-arc/page.tsx
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                               // shadcn primitives
│   │   ├── brand/                            // logo, footer, nav
│   │   ├── landing/                          // hero, sections
│   │   ├── dashboard/                        // shared dashboard chrome
│   │   ├── charts/
│   │   ├── code/                             // code block, copy button, lang badge
│   │   └── receipts/                         // receipt-row, receipt-card, receipt-feed
│   ├── lib/
│   │   ├── api.ts                            // typed client for the api-gateway
│   │   ├── format.ts                         // formatAddress, formatUsdc, formatRelativeTime
│   │   └── query-client.ts                   // TanStack Query setup
│   └── styles/
│       └── globals.css                       // Tailwind directives + CSS vars
```

---

## 5. Information architecture

| Route | Purpose | Audience | Auth |
|---|---|---|---|
| `/` | Marketing landing | First-time visitors | Public |
| `/why-arc` | Margin/economics explainer | Skeptical devs, judges | Public |
| `/demo` | Live demo (runs the 60-tx demo script) | Hackathon judges, prospects | Public |
| `/publisher/[id]` | Publisher dashboard — earnings + live feed + charts | Publishers (their own id) | Public read in v0 |
| `/publisher/[id]/receipts` | Full receipt history with filters + export | Publishers | Public read in v0 |
| `/crawler/[wallet]` | Crawler dashboard — spend + budget + top publishers | Crawler operators | Public read in v0 |
| `/crawler/[wallet]/receipts` | Full receipt history | Crawler operators | Public read in v0 |

v0 has **no auth** — anyone can view any publisher/crawler URL. The dashboards are essentially public profile pages. v1 adds wallet-signature auth for the publisher settings page (out of scope here).

---

## 6. Page specifications

### 6.1 `/` — Landing page

The most important page. Optimized for a developer landing cold from a tweet, scrolling once on desktop, deciding within 15 seconds whether to install the SDK.

**Structure (in order, with named sections):**

#### 6.1.1 Top nav (sticky, ~64px)

Left: CrawlPay wordmark (text logo, mono-ish but legible).
Center: nothing (don't clutter).
Right (in order, all with `text-secondary` color, hover to `text-primary`):
- `Publishers` (anchor to section 6.1.4)
- `Crawlers` (anchor to section 6.1.5)
- `Why Arc` (link to `/why-arc`)
- `Demo` (link to `/demo`)
- `GitHub ↗` (external link, with arrow-up-right icon)
- A primary button: `Get started` (accent background, links to GitHub README quickstart)

#### 6.1.2 Hero (~90vh on desktop)

```
                    [small chip: Built on Arc · Circle Nanopayments · USDC]

                    Pay-per-crawl
                    infrastructure
                    for the open web.

                    Publishers charge AI crawlers per URL. Crawlers pay $0.0001
                    per fetch, gas-free, with a cryptographic receipt.
                    No new protocol. No lock-in.

                    [primary button: Add to your site →]
                    [ghost button: Install the SDK]

                    [tiny secondary line: BUSL-1.1 · self-host anytime]
```

Background: `--gradient-hero` with a very subtle animated grain (CSS-only, no canvas).
Hero text: 72px display, weight 600, `letter-spacing: -0.04em`. The phrase "Pay-per-crawl" gets `color: --accent` on the word "Pay".

Below the buttons, a live ticker (small, `text-secondary`, 14px):

> **`$0.0234 USDC settled in the last hour · 247 paid crawls`**

Wire this to `GET /receipts?limit=100` and compute on the client. Poll every 30s. If zero, hide the ticker.

#### 6.1.3 Problem/solution (~600px tall)

Two-column on desktop, stacked on mobile.

Left column heading: **"The problem"**
- A human reads a few pages a day. An AI crawler reads hundreds of thousands.
- At that scale, flat subscriptions either overcharge small users or undercharge heavy ones.
- Blocking crawlers leaves money on the table for publishers and kills access for crawlers that would happily pay.

Right column heading: **"The fix"** (with accent color underline)
- Per-request pricing as small as $0.0001.
- Gas-free, settled continuously in the background.
- Every paid fetch produces a portable cryptographic receipt.
- Drop it in with three lines of middleware. Or self-host the whole stack.

#### 6.1.4 "For publishers" section

Headline: **"For publishers"**
Subhead: **"Earn from the crawlers that are already reading your site."**

Two-column: code block on left, talking points on right.

Code block (TypeScript, with copy button):

```typescript
import express from 'express';
import { crawlpay } from '@crawlpay/proxy-middleware';
import { PrivateKeyReceiptSigner } from '@crawlpay/receipt-signer';

const app = express();

app.use(crawlpay({
  publisherId: 'pub_yourSite',
  publisherWallet: '0xYourArcWallet',
  network: 'arcTestnet',
  defaultPrice: 100n,          // $0.0001 per crawl
  receiptSigner: new PrivateKeyReceiptSigner(process.env.CRAWLPAY_RECEIPT_PRIVATE_KEY),
}));

app.get('/articles/:slug', (req, res) => {
  res.send('<article>…</article>');
});
```

Talking points (bullets, each with a small lucide icon to the left):
- 🔧 (Wrench) **Three lines of middleware.** Express today; Fastify, Go, Python coming.
- 💸 (CircleDollarSign) **Humans are free.** Built-in bot classifier paywalls only crawlers.
- 📜 (Receipt) **Signed receipts.** Every paid fetch is portable proof of access — verifiable without our database.
- 🧩 (Puzzle) **Glob pricing rules.** `/free/**` is free, `/research/**` is $0.001.
- 🔐 (Lock) **Your wallet, your keys.** We never touch the funds. Circle Gateway batches USDC directly to you.

CTA at bottom: `Add to your site →` (links to GitHub quickstart).

#### 6.1.5 "For crawlers" section

Headline: **"For crawler operators"**
Subhead: **"Stop getting blocked. Pay fairly. Keep a receipt."**

Two-column flipped: talking points on left, code block on right.

Talking points:
- 📦 (Package) **Drop-in `fetch`.** `await crawler.fetch(url)` does the whole 402 dance.
- 🎯 (Target) **Per-request caps + daily budget.** Never overspend by accident.
- 🗄️ (Database) **Receipt cache.** Don't pay twice for the same URL in 24h.
- 🔁 (RefreshCw) **Smart retries.** Built-in policy for every Gateway error code.
- 📊 (BarChart3) **Full spend visibility.** Dashboard shows every cent, every URL.

Code block (TypeScript, with copy button):

```typescript
import { CrawlPayClient } from '@crawlpay/crawler-sdk';
import { dollarsToAtomic } from '@crawlpay/types';

const crawler = new CrawlPayClient({
  privateKey: process.env.CRAWLER_PRIVATE_KEY,
  network: 'arcTestnet',
  maxPerRequest: dollarsToAtomic('0.001'),
  dailyBudget: dollarsToAtomic('5.00'),
  userAgent: 'MyResearchBot/1.0 (+https://mybot.example/contact)',
});

const { data, paid, receipt } = await crawler.fetch(
  'https://example-publisher.com/articles/foo',
);
```

CTA at bottom: `Install the SDK →` (links to npm package).

#### 6.1.6 How it works (architecture)

Headline: **"How it works"**
Subhead: **"x402 negotiates. Circle settles. Arc finalizes."**

A single SVG diagram, ~800px wide on desktop. Five steps in a horizontal flow:

```
[Crawler]  →  [Publisher]  →  [402 + offer]  →  [Crawler signs EIP-3009]
                                                      ↓
              [Circle Gateway]  ←  [POST /verify]  ←  [Publisher]
                     ↓
              [Arc Testnet batch]                  [200 + Receipt]  →  [Crawler]
```

Each box: 16px padding, 12px radius, `--bg-surface` background, 1px `--border-subtle` border. Connecting arrows: 1.5px `--text-tertiary`, with a small accent dot at every arrowhead.

Below the diagram, three small numbered notes (`text-secondary`, 14px):

1. **Sub-cent settlement.** USDC has 6 decimals; the smallest payment is 0.000001 USDC.
2. **Gas-free for both sides.** Circle batches thousands of authorizations into one Arc transaction.
3. **You can verify a receipt with no DB.** Public key from `GET /pubkey`, signature on the receipt itself.

#### 6.1.7 Pricing transparency

Headline: **"What you pay"**
Subhead: **"It's open source. The only price is the protocol fee on the hosted service."**

Three pricing cards, side-by-side:

| Tier | Price | What you get |
|---|---|---|
| **Self-host** | Free forever | Full stack, BUSL-1.1, you run Postgres + Redis + the facilitator |
| **Hosted (v0 testnet)** | Free during testnet | Our facilitator, our DB, your wallet |
| **Hosted (mainnet, v1)** | 2.5% of settled USDC | Same as testnet + uptime SLA, dashboard, webhooks |

Each card: `--bg-surface`, 24px padding, accent border on the recommended tier (Hosted v0 testnet).

#### 6.1.8 Demo CTA strip

Full-width band with `--bg-elevated` background.

```
                  See it actually work.

       [primary button: Watch the live demo →]

  Real testnet payments. Real Arc transactions. Real receipts.
```

Links to `/demo`.

#### 6.1.9 Footer

Three columns:

**Product:** Publishers · Crawlers · Pricing · Demo · Why Arc
**Resources:** GitHub · npm · Docs (link to GitHub README for now) · Protocol spec (x402.org)
**Built on:** [Arc badge] [Circle badge] [USDC badge] [x402 badge] [EIP-3009 badge]

Bottom strip: `© 2026 Second Gate · BUSL-1.1 (converts to Apache 2.0 on 2029-04-22)`

---

### 6.2 `/why-arc` — Margin explainer

A single long page, designed to convince a skeptical dev or hackathon judge.

Hero:

> **"Why Arc is the only chain where this works."**
> Sub-cent payments need sub-cent settlement. Everywhere else, gas eats the payment.

Below the hero, **the math** (large, prominent):

> 60 fetches × $0.0001 = **$0.006 revenue**
> Ethereum gas (60 tx) ≈ **$6 — $60+**
> Base gas (60 tx) ≈ **$0.30**
> Arc + Circle Gateway = **~$0** (one batch tx, gas in USDC)

Show this as four big numbers, mono, stacked vertically, each with a small subtitle.

Then a comparison table:

| Chain | Gas token | Avg per-tx gas (USD) | Min viable payment | Sub-cent payments? |
|---|---|---|---|---|
| Ethereum | ETH (volatile) | $1 — $20 | ~$5+ | ❌ |
| Base | ETH | ~$0.005 | ~$0.05+ | borderline |
| Polygon | MATIC | ~$0.001 | ~$0.01 | borderline |
| **Arc + Circle Gateway** | **USDC** | **~$0 per payment (batched)** | **$0.000001** | **✓** |

Highlight the Arc row with a left accent border and slightly elevated background.

Below the table: **"How batching works"** — same diagram from the landing page, embedded.

End with a CTA: `Add CrawlPay to your site →`.

---

### 6.3 `/demo` — Live demo page

The hackathon centerpiece. A judge clicks one button and watches 60 paid crawls happen in real time.

Layout (single-column, max-width 1024px):

**Top:**
- Title: **"Live demo"**
- Subtitle: **"5 publishers · 12 fetches each · 60 real Arc Testnet transactions"**
- Big primary button: **`Run the demo`** (when idle) → becomes **`Running… 23/60`** (when running) → becomes **`Run it again`** (when done)

**Counter strip (always visible, 4 stat cards in a row):**

| Stat | Value (large mono, accent) | Label (small, secondary) |
|---|---|---|
| 1 | `47 / 60` | Paid crawls so far |
| 2 | `$0.0047` | Total settled USDC |
| 3 | `1.8s` | Avg per fetch |
| 4 | `5 / 5` | Publishers responding |

**Streaming log (terminal-style, fixed-height ~480px, scrollable, latest at bottom):**

Each log row:
```
[12:43:21]  ✓  pub_techNotes        $0.0001  →  0.0001 USDC  →  arcscan.app/tx/0x1f…  ·  840ms
[12:43:23]  ✓  pub_researchDigest   $0.0005  →  0.0005 USDC  →  arcscan.app/tx/0x9b…  ·  1.2s
[12:43:24]  ✗  pub_devDocsCentral   $0.0002  →  retry_offer  →  attempt 1 of 3
[12:43:26]  ✓  pub_devDocsCentral   $0.0002  →  0.0002 USDC  →  arcscan.app/tx/0xff…  ·  720ms
```

Format: mono, 13px, color-coded — accent for ✓, warning for ✗ and retries.
Receipts have the settlement reference as a clickable link.

**Below the log: receipt feed (last 5 receipts, cards):**

Each card shows:
- Publisher domain + crawler address (truncated)
- Amount in mono accent
- Timestamp (relative — "12s ago")
- A small "Verified ✓" badge if signature checks pass
- Click → opens receipt detail modal showing the canonical JSON + signature

**Wiring:**
- Clicking `Run the demo` POSTs to `POST /api/demo/run` (a new endpoint in the api-gateway — out of scope for this design brief, the implementation team adds it).
- The streaming log uses Server-Sent Events from `GET /api/demo/events` (also out of scope, but design as if it exists).
- The receipt feed polls `GET /receipts?limit=5` every 5s.
- The counter strip aggregates from the same `/receipts` endpoint.

If the demo endpoint doesn't exist yet, gracefully show: "Demo runner offline. Connect to a facilitator with a demo endpoint or run `pnpm demo` locally."

---

### 6.4 `/publisher/[id]` — Publisher dashboard

This is the most-loved-by-publishers screen. Show them their money.

**Layout:** dashboard chrome (top nav + side rail), main content area.

#### Top nav

Same as landing top nav, but with:
- Active state on the publisher's section
- A small "switch view" dropdown if there are multiple publishers (v1)
- An address chip showing the publisher's wallet (with copy button)

#### Side rail (collapsible, 240px expanded)

- 📊 Overview (current page)
- 🧾 Receipts (`/publisher/[id]/receipts`)
- ⚙️ Settings (v1, show as disabled with "Coming soon" badge)

#### Main content

**Header strip:**
- Publisher domain (e.g. `technotes.example.com`) in large display
- Publisher id (mono, secondary, small)
- ERC-8004 reputation badge if present (small chip)
- Network chip (e.g. `Arc Testnet`)

**KPI cards (4 across):**

| Card | Value | Trend (vs last period) |
|---|---|---|
| Earnings (last 7d) | `$0.4237 USDC` | `+12.4% ↗` (accent if up) |
| Paid crawls | `4,237` | `+8.1% ↗` |
| Unique crawlers | `34` | `+2 new` |
| Avg per crawl | `$0.0001` | flat |

Each card: 24px padding, large mono value (32px), secondary trend line below.

**Chart: Earnings over time (Tremor LineChart, full-width, 320px tall):**
- X axis: last 30 days
- Y axis: USDC (formatted)
- One line (accent color), with subtle area fill
- Tooltip on hover shows date + amount + receipt count

**Window selector** (chip group above the chart): `Day · Week · Month`. Default to `Week`.

**Top crawlers (table, 5 rows):**
Columns: Crawler wallet (truncated, copyable) · Total paid · Crawls · Last seen
Sortable by Total paid. Row hover surfaces a "View receipts" link to `/crawler/[wallet]`.

**Live receipt feed (right side, ~360px wide on desktop; below the chart on mobile):**
Top header: "Live receipts" with a small pulsing accent dot.
List of latest 10 receipts, newest first. Each row:
- URL (truncated, hover to see full)
- Amount (mono accent)
- Crawler address (truncated, copyable)
- Time (relative)
Polls `GET /publishers/[id]/receipts?limit=10` every 5s.

**Empty state** (no receipts yet):
```
No paid crawls yet.
Once a crawler hits a paywalled URL, you'll see it here in real time.
[secondary button: View setup instructions →]
```

---

### 6.5 `/publisher/[id]/receipts` — Full receipt history

Full-width table view. Above the table:

**Filters (a row of chips):**
- Date range picker (default: last 30d)
- Crawler wallet (search input)
- URL pattern (search input)
- Status (settled vs pending — based on `onchainTxHash` presence)

**Export button** (top-right): `Export CSV` → downloads filtered receipts as CSV.

**Table columns:**
1. Timestamp (relative + tooltip with absolute)
2. URL (truncated, hover full)
3. Crawler (truncated address, copyable)
4. Amount (mono, accent)
5. Status — `Pending` chip if no `onchainTxHash`, `Settled` chip (accent) if present
6. Receipt — small button: `View` → opens modal with canonical receipt JSON + signature + a "Verify signature" button that calls `POST /receipts/verify`

**Pagination:** infinite scroll preferred; pagination buttons acceptable. Use `limit=50` per page.

---

### 6.6 `/crawler/[wallet]` — Crawler dashboard

Mirror of the publisher dashboard, but viewed from the crawler's perspective.

**Header strip:**
- Crawler wallet address (large mono, copyable)
- ERC-8004 reputation badge if present
- Network chip

**KPI cards (4 across):**

| Card | Value | Trend |
|---|---|---|
| Total spend (last 7d) | `$1.2387 USDC` | `−4.2% ↘` (warning if budget-concerning) |
| Paid crawls | `12,387` | `+1,247 vs last week` |
| Unique publishers | `47` | — |
| Daily budget used | `$0.42 / $5.00` (8.4%) | progress bar (accent) |

**Daily budget bar** is the standout: a horizontal bar with three states colored:
- 0–60% accent green
- 60–85% warning amber
- 85%+ error red

**Chart: Spend over time** — same shape as publisher's earnings chart, just inverted in semantics.

**Top publishers (table, 5 rows):**
Columns: Publisher domain · Total paid · Crawls · Avg per crawl
Sortable. Row → links to `/publisher/[id]`.

**Live receipt feed (right side):** newest fetches by this crawler, same shape as publisher's feed.

---

### 6.7 `/crawler/[wallet]/receipts` — Crawler receipt history

Same shape as the publisher version. Columns are publisher-focused instead of crawler-focused. Export CSV button included.

---

### 6.8 `/not-found.tsx` — 404

Single page, centered, simple:

> **404**
> Couldn't find that page.
> [link: Back to home]

Don't be cute. No "lost robot" illustration.

---

## 7. Reusable components

These should live in `src/components/` and be used across pages.

### 7.1 `<CodeBlock />`

Props: `language`, `code`, `filename?`, `showLineNumbers?` (default true).

Renders:
- A header bar with the filename (left) and a small language chip (right).
- The code, syntax-highlighted (Shiki preferred over Prism for the cleaner output — Shiki has Geist-friendly themes).
- A copy button (top-right of the block) that copies the code and shows "Copied ✓" for 1.5s.
- Background `--bg-elevated`, 16px radius, 24px padding inside.

### 7.2 `<AddressChip />`

Props: `address: \`0x\${string}\``, `truncate?: 'middle' | 'end'` (default middle), `copyable?: boolean` (default true).

Renders the address in mono, truncated to `0x9D8e…f381`. On hover: full address tooltip. On click of the optional copy button: copies and shows brief confirmation.

### 7.3 `<UsdcAmount />`

Props: `amount: bigint | string` (atomic USDC), `size?: 'sm' | 'md' | 'lg' | 'xl'`, `accentZero?: boolean` (default false).

Formats atomic USDC into a display string. Always mono. Always shows the appropriate decimals (don't trim trailing zeros for amounts < $0.01 — `$0.0001` not `$0.0001`).

### 7.4 `<ReceiptCard />`

Renders a single `CrawlPayReceipt` as a compact card:
- Publisher (id + truncated address)
- Crawler (truncated address)
- URL (truncated)
- Amount (accent)
- Timestamp (relative)
- "Verified ✓" badge (computed client-side by calling `POST /receipts/verify`)
- A small expand button to show the canonical JSON + signature
- A link to the settlement reference (Arc tx UUID for now — Arcscan link once on-chain)

### 7.5 `<RelativeTime />`

Props: `timestamp: number` (unix seconds).
Renders "12s ago", "3m ago", "yesterday", etc. Updates every 30s while mounted.
Tooltip on hover: absolute ISO timestamp.

### 7.6 `<NetworkChip />`

Renders a small pill: `Arc Testnet` (or whatever network). Includes a tiny network icon.
On click: copies the CAIP-2 string (`eip155:5042002`).

### 7.7 `<KpiCard />`

Props: `label`, `value`, `trend?: { value: string; direction: 'up' | 'down' | 'flat' }`.
Renders the layout described in the dashboard specs.

### 7.8 `<DashboardChrome />`

Wraps any dashboard page: top nav + side rail + content slot. Handles the collapsible rail and the active-page highlight.

### 7.9 `<EmptyState />`

Props: `title`, `description`, `cta?: { label; href }`, `illustration?: ReactNode`.

Used when a list has zero items. Don't use illustrations from clipart sites; if you include one, draw a simple line-icon style SVG inline (matching lucide aesthetic).

---

## 8. Live data integration

### 8.1 API client

`src/lib/api.ts` exposes typed functions:

```typescript
import type { CrawlPayReceipt, PublisherRecord } from '@crawlpay/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function listReceipts(params: {
  publisher_id?: string;
  crawler_wallet?: string;
  limit?: number;
  offset?: number;
}) {
  const qs = new URLSearchParams(params as Record<string, string>);
  const r = await fetch(`${BASE}/receipts?${qs}`);
  if (!r.ok) throw new Error(`receipts list ${r.status}`);
  return (await r.json()) as {
    receipts: CrawlPayReceipt[];
    pagination: { total: number; limit: number; offset: number };
  };
}

export async function getPublisher(id: string) { /* ... */ }
export async function listPublishers(params?: { limit?: number; offset?: number }) { /* ... */ }
export async function getPublisherAnalytics(id: string, window: 'day' | 'week' | 'month') { /* ... */ }
export async function getCrawlerAnalytics(wallet: string, window: 'day' | 'week' | 'month') { /* ... */ }
export async function verifyReceipt(receipt: CrawlPayReceipt) { /* ... */ }
```

Re-import types from `@crawlpay/types` (already in the workspace).

### 8.2 TanStack Query setup

`src/lib/query-client.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s; receipts feel real-time enough
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
```

Live feeds use `refetchInterval: 5_000` per-query.

### 8.3 Endpoint contracts (use exactly these shapes)

```typescript
// GET /receipts?publisher_id=…&crawler_wallet=…&limit=20&offset=0
type ListReceiptsResponse = {
  receipts: CrawlPayReceipt[];
  pagination: { total: number; limit: number; offset: number };
};

// GET /publishers
type ListPublishersResponse = {
  publishers: PublisherRecord[];
  pagination: { total: number; limit: number; offset: number };
};

// GET /publishers/:id/receipts
type PublisherReceiptsResponse = {
  publisher: { id: string; domain: string };
  receipts: CrawlPayReceipt[];
  pagination: { total: number; limit: number; offset: number };
};

// GET /analytics/publisher/:id?window=week
type PublisherAnalyticsResponse = {
  analytics: {
    publisherId: string;
    window: 'day' | 'week' | 'month';
    totalRevenueAtomic: string;       // bigint as string
    totalRequestCount: number;
    uniqueCrawlers: number;
    daily: Array<{
      date: string;                   // YYYY-MM-DD
      totalAtomic: string;
      requestCount: number;
      uniqueCounterparties: number;
    }>;
  };
};

// POST /receipts/verify   (body: { receipt: CrawlPayReceipt, expectedSigner?: string })
type VerifyReceiptResponse = {
  valid: boolean;
  recoveredAddress: string;
  claimedAddress: string;
  reason?: string;
};
```

All atomic-USDC values come back as strings (BigInt-as-string). Convert client-side with `BigInt(value)` if you need to do math; format for display with the `<UsdcAmount />` component.

---

## 9. Sample data (use this when the API is down)

For development without the api-gateway running, ship a `lib/mock-data.ts`:

```typescript
export const MOCK_PUBLISHERS = [
  { id: 'pub_techNotes', domain: 'technotes.example.com', /* ... */ },
  { id: 'pub_researchDigest', domain: 'research-digest.example.com', /* ... */ },
  // ...
];

export const MOCK_RECEIPTS: CrawlPayReceipt[] = [ /* 50 plausible receipts */ ];
```

The app detects when the API is unreachable and falls back to mock data, with a small chip in the top nav: `Demo data — API offline`.

---

## 10. Accessibility

- Hit `WCAG 2.1 AA` for the marketing pages (landing, why-arc, demo).
- Dashboards aim for AA but can defer some edge cases to v1.
- Color contrast: every text/background pair ≥ 4.5:1.
- All interactive elements reachable by keyboard. Focus rings use `--accent-glow`.
- All images have `alt` text. Decorative SVGs get `aria-hidden`.
- Respect `prefers-reduced-motion` (disable parallax, reduce animations).
- Forms (publisher onboarding wizard in v1): proper `<label>` linking, `aria-invalid` on errors.

---

## 11. SEO + OG

- Each page sets `<title>` and `<meta description>` via Next.js metadata.
- Open Graph: site-wide default OG image (a CrawlPay-branded card, dark gradient, the wordmark, and the tagline "Pay-per-crawl infrastructure for the open web").
- Per-page OG images for the landing page only; other pages use the default.
- `robots.txt` allows all crawlers (we'd be hypocrites otherwise). Sitemap at `/sitemap.xml`.

---

## 12. Performance budgets

- Landing page: initial JS ≤ 200KB gzipped. LCP ≤ 1.5s on a 4G connection.
- Dashboard: initial JS ≤ 350KB gzipped (heavier because of TanStack Query + Tremor). LCP ≤ 2s.
- Use `next/dynamic` for the chart components — they load on demand.
- Use `next/font` for both Geist Sans and Geist Mono so they're preloaded with the document.

---

## 13. Acceptance criteria

The implementation is complete when:

1. All routes in section 5 are reachable and don't throw.
2. The landing page renders with real ticker data when `NEXT_PUBLIC_API_URL` points to a running api-gateway.
3. The publisher dashboard renders earnings + live feed + chart for a real publisher in Postgres.
4. The crawler dashboard mirrors the publisher dashboard with inverted semantics.
5. The demo page either runs the demo (when the runner endpoint exists) or shows the graceful offline message.
6. The `/why-arc` page renders the math block and the comparison table.
7. Every interactive element has a visible focus state.
8. Dark mode is the only theme implemented; no broken light-mode artifacts.
9. The page hits the API gateway via `fetch` — no proxying through Next.js API routes for v0.
10. The CSS-variable color system is honored. No hard-coded hex values inside components.
11. There are no console errors on any route.
12. `pnpm --filter @crawlpay/web-dashboard build` produces a clean production bundle.
13. The fonts (Geist Sans + Geist Mono) load via `next/font`, no FOUC.
14. Mobile viewport (375px): landing page is usable; dashboards show a "Best viewed on desktop" hint but don't crash.

---

## 14. Out of scope for v0

Do not implement these — they are explicitly v1+:

- Wallet connect (WalletConnect / Reown). v0 dashboards are public-read by URL.
- Publisher settings page (pricing rule editor, allowlist/blocklist editor).
- Light mode toggle.
- Crawler registration form (the `crawlers` table stays empty in v0).
- Webhook configuration UI.
- ERC-8004 reputation write actions (read-only badges only).
- i18n (English only for v0).
- Per-page analytics tracking (no Vercel Analytics, no Plausible — add in v1 once we have users).

---

## 15. What to deliver

When you're done, the workspace should have:

```
apps/web-dashboard/
├── package.json                              @crawlpay/web-dashboard
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── public/
├── src/
│   ├── app/  (all routes from section 5)
│   ├── components/
│   ├── lib/
│   └── styles/
```

And the workspace root `package.json` should have:

```json
"dev:web": "pnpm --filter @crawlpay/web-dashboard dev",
"build:web": "pnpm --filter @crawlpay/web-dashboard build"
```

Add `apps/web-dashboard` to `pnpm-workspace.yaml` (it should already be covered by `apps/*`).

The dev server boots on `:3000`. The api-gateway is on `:8080`. The facilitator is on `:3001`. Don't change these defaults.

---

## 16. One non-negotiable

If at any point you're tempted to add stock photography, a "We use cookies" banner that doesn't actually need consent, a chatbot widget, an exit-intent popup, or anything that says "AI-powered" without specifying what — don't.

---

## 17. UI element catalog

This is the inventory of primitives. Every page composes from these — don't invent ad-hoc variants.

### 17.1 Buttons

| Variant | Background | Border | Text | Use |
|---|---|---|---|---|
| `primary` | `--accent` | none | `#0A0A0B` | One per section (the primary CTA) |
| `secondary` | `--bg-surface` | 1px `--border-strong` | `--text-primary` | Adjacent to primary, lower hierarchy |
| `ghost` | transparent | none | `--text-secondary` | Nav, tertiary actions |
| `destructive` | transparent | 1px `--error` | `--error` | Delete, remove, ban |
| `link` | none | none | `--accent`, underline on hover | Inline in copy |

Sizes (height / horizontal padding / font-size):
- `sm`: 32 / 12 / 13
- `md` (default): 40 / 16 / 14
- `lg`: 48 / 24 / 15

States:
- `hover`: primary → `--accent-hover`; secondary → `--bg-elevated`; ghost → `--text-primary`.
- `focus-visible`: 2px ring in `--accent-glow`, offset 2px from background.
- `active`: scale-down to 0.97 via Framer (`whileTap={{ scale: 0.97 }}`).
- `disabled`: opacity 0.4, no pointer events, no hover.
- `loading`: keep label, prepend a 14px `Loader2` icon with `animate-spin`.

Spacing: 12px gap between adjacent buttons.

### 17.2 Inputs

Text / number / address inputs:
- Height: 40px (matches `md` button).
- Padding: 12px horizontal.
- Background: `--bg-surface`.
- Border: 1px `--border-subtle`; on focus: 1px `--accent` + 2px `--accent-glow` ring.
- Radius: 8px.
- Placeholder color: `--text-tertiary`.
- Font: mono for address and amount inputs; sans for all others.

Slots:
- Optional **prefix** (icon or small text, e.g. `$` for amount): inset 12px from left, separate from input value by a 1px `--border-subtle` divider.
- Optional **suffix** (icon, e.g. paste button): same on the right.

States:
- `error`: border `--error`, helper text below in `--error` (13px).
- `success`: subtle accent check icon in suffix, no border change.
- `disabled`: opacity 0.5, no caret.

Helper text: 13px `--text-tertiary`, mounted below input with 6px gap.

### 17.3 Cards

| Variant | Background | Border | Use |
|---|---|---|---|
| `default` | `--bg-surface` | 1px `--border-subtle` | KPI cards, list rows |
| `elevated` | `--bg-elevated` | 1px `--border-subtle` | Code blocks, modals, hover-raised cards |
| `accented` | `--bg-surface` | 1px `--accent`, left-border 3px | Highlighted item (e.g. recommended pricing tier) |

Padding: 24px default. Radius: 12px. Hover (only for interactive cards): translate-y −2px, border → `--border-strong`. 150ms.

### 17.4 Dialogs / modals

- Backdrop: `--bg-overlay` with `backdrop-blur-md` (Tailwind).
- Container: `--bg-elevated`, 16px radius, max-width 560px, padding 32px.
- Animation: backdrop fades in 250ms; container scales 0.96 → 1.0 + fade in 250ms with spring `{ stiffness: 320, damping: 28 }`.
- Close on ESC, close on backdrop click, focus trap (use `@radix-ui/react-dialog` via shadcn).
- Title: 20px, weight 600. Description: 14px `--text-secondary`. Actions row: bottom-right, primary on the right.

### 17.5 Toasts

- Library: `sonner` (https://sonner.emilkowal.ski/) — better than shadcn's built-in toast.
- Position: top-right, 16px from edges.
- Auto-dismiss: 4s for success/info, 6s for warning, sticky for error (manual dismiss).
- Width: 360px max.
- Animation: slide-in from right with spring, fade-out on dismiss.

### 17.6 Tooltips

- Library: `@radix-ui/react-tooltip` via shadcn.
- Background: `--bg-elevated`, 1px `--border-strong`, 8px radius, 8/12 padding.
- Font: 12px `--text-primary`.
- Delay: 400ms show, 0ms hide.
- Arrow: 6px, same border treatment.

### 17.7 Badges / chips

- Height: 22px. Padding: 0/8. Radius: 6px. Font: 12px medium.
- Variants:
  - `default`: `--bg-elevated` bg, `--text-secondary` text
  - `accent`: `--accent-subtle` bg, `--accent` text
  - `success`: same as accent (we don't need a separate green)
  - `warning`: amber-tinted equivalent
  - `error`: red-tinted equivalent
- Optional leading dot (8px, same color as text) for status-style chips like `Live`, `Pending`, `Settled`.

### 17.8 Tables

- Header: sticky on scroll, `--bg-surface` background, 13px `--text-tertiary`, uppercase letter-spacing 0.05em.
- Row: 48px tall, 1px bottom border `--border-subtle`, hover bg `--bg-elevated`.
- Sortable columns: clickable header with chevron icon indicating sort direction.
- Pagination footer: 64px tall, with row-count text on left and prev/next buttons on right.
- Empty state: see §17.10.

### 17.9 Progress bars

- Height: 6px (compact) or 10px (KPI). Radius: full.
- Track: `--bg-elevated`. Fill: `--accent`.
- Animated transition: width changes via Framer with 600ms ease-out.
- Color states (budget bar): 0–60% accent, 60–85% warning, 85%+ error.

### 17.10 Empty states

Composition (top to bottom):
- Optional 48×48 lucide icon, `--text-tertiary`, no fill.
- Title: 16px `--text-primary`, weight 500.
- Description: 14px `--text-secondary`, max 60 characters per line.
- Optional CTA button (ghost or secondary, never primary).

Vertically center inside the container. Padding 48px minimum around content.

### 17.11 Skeletons

Use only when waiting on data that takes more than 300ms. Pure CSS shimmer (no JS lib):

```css
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.skeleton { background: linear-gradient(90deg, var(--bg-surface) 0%, var(--bg-elevated) 50%, var(--bg-surface) 100%); background-size: 200% 100%; animation: shimmer 1.5s linear infinite; border-radius: 6px; }
```

Sizes mirror the content (rectangle for a value, line for text, circle for an avatar).

### 17.12 Avatars / wallet identicons

Wallets get a **deterministic identicon** generated from the address — use `@dicebear/core` with the `identicon` style, 32×32, colored with a hash-derived hue from the accent palette range. Cache the SVG client-side.

---

## 18. Motion & interaction patterns

These are the named patterns to use. Each one is a recipe — implement it the same way every time.

### 18.1 Hero entrance

When the landing page mounts, the hero animates in as follows:

1. **Word stagger**: split the headline into spans per word, animate each with `y: 12 → 0` + `opacity: 0 → 1`, stagger 60ms per word, 400ms duration.
2. **Subtitle**: starts 200ms after the headline finishes, same y/opacity, 350ms duration.
3. **Buttons**: start 300ms after the subtitle, same pattern but staggered by 80ms each.
4. **Background gradient mesh**: a slow `scale: 1.05 → 1.0` over 1200ms with `easeOut`, fading in simultaneously.

Framer pattern:

```tsx
const wordVariants = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } },
};

<motion.h1 initial="hidden" animate="visible" transition={{ staggerChildren: 0.06 }}>
  {words.map((w, i) => <motion.span key={i} variants={wordVariants}>{w} </motion.span>)}
</motion.h1>
```

### 18.2 Scroll-reveal sections

Every landing-page section below the hero fades up as it enters the viewport:

```tsx
import { motion, useReducedMotion } from 'motion/react';

const sectionVariants = (prefersReduced: boolean | null) => ({
  hidden: { y: prefersReduced ? 0 : 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] } },
});

<motion.section
  initial="hidden"
  whileInView="visible"
  viewport={{ once: true, margin: '-100px' }}
  variants={sectionVariants(useReducedMotion())}
>
  ...
</motion.section>
```

`once: true` fires the animation only the first time — don't re-trigger on scroll-back.

### 18.3 Card hover lift

Used on KPI cards, top crawler/publisher rows, pricing tier cards:

```tsx
<motion.div
  whileHover={{ y: -2, transition: { duration: 0.15 } }}
  className="rounded-xl bg-surface border border-subtle p-6 cursor-pointer"
  style={{ borderColor: 'var(--border-subtle)' }}
>
  ...
</motion.div>
```

Combined with a CSS `:hover` rule that bumps the border color to `--border-strong`.

### 18.4 Number rolling (live data)

When a KPI value updates (e.g. earnings tick up), animate the digits rolling. Use `framer-motion`'s `useMotionValue` + `useTransform` + `animate()`:

```tsx
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => v.toFixed(4));
  useEffect(() => { animate(motionValue, value, { duration: 0.6, ease: 'easeOut' }); }, [value]);
  return <motion.span>{rounded}</motion.span>;
}
```

Color flash: when value increases by more than the previous, briefly flash the text color to `--accent` for 400ms then ease back to `--text-primary`.

### 18.5 New-receipt pulse

When a new receipt arrives in the live feed:
- The new row inserts at the top with `height: 0 → 48px` + `opacity: 0 → 1`, 250ms.
- A 2px left border pulses in `--accent` (`opacity: 1 → 0` over 1.2s).
- A small `--accent` dot appears next to the timestamp, fades after 2s.

### 18.6 Reduced motion

Top-level layout file calls `useReducedMotion()` once and provides via context. All animation variants check it and either reduce duration to 0 or skip the transform entirely:

```tsx
const prefersReduced = useReducedMotion();
const variants = prefersReduced
  ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
  : fullVariants;
```

### 18.7 Page transitions

Use Next.js App Router's built-in routing — wrap children with `<motion.div>` keyed by `pathname` for a fade transition:

```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

Marketing pages only — dashboards don't transition between routes (would feel slow with TanStack Query refetches).

### 18.8 Code-block copy feedback

When the copy button is clicked:
- The icon swaps from `Copy` to `Check` instantly.
- Button background flashes `--accent-subtle` for 200ms then fades.
- A toast: "Copied" — 1.5s auto-dismiss.

### 18.9 Demo button states

The big `Run the demo` button on `/demo` is the most visible animation in the product. State transitions:

- **Idle → Running**: button width keeps fixed; label slides up (out of view), counter slides in. 250ms.
- **Running**: small accent dot pulses next to the counter (`scale: 0.8 → 1.2` over 800ms, loops, with `--accent` opacity flick).
- **Running → Done**: a single shimmer sweep left-to-right across the button (300ms), counter swaps to `Done · 60/60`. Then label slides back in: "Run it again".

### 18.10 Receipt "Verified ✓" stamp

When `POST /receipts/verify` returns `{ valid: true }`, the badge:
- Mounts with `scale: 0.6 → 1.0` spring (`stiffness: 600, damping: 24`) — 250ms.
- Checkmark stroke draws in over 200ms (SVG path `pathLength` animation).
- Settles with a subtle `--accent-glow` halo for 600ms, then steady state.

### 18.11 Architecture diagram animation

On `/` section 6.1.6 and `/why-arc`, the diagram has an optional "Run it" affordance: a small button that animates a packet flowing through the diagram (crawler → publisher → Circle → Arc → back to crawler). Use SVG path animation with Framer's `motion.circle` riding a `motion-path`. Loop on click only, not auto.

---

## 19. Chart specs (Tremor)

Concrete patterns for every chart in the product. Tremor's declarative API
keeps these short — most of the work is in the `valueFormatter`, `colors`,
and `customTooltip` props.

### 19.1 Earnings / spend area chart (`<EarningsChart />`)

Used on publisher and crawler dashboards. Window selector switches the data
(`day | week | month`). Area chart (filled) reads better than a line chart
for "money over time" — the fill carries the magnitude.

```tsx
import { AreaChart } from '@tremor/react';
import { formatUsdc } from '@/lib/format';

<AreaChart
  data={dailySeries}
  index="date"
  categories={['totalAtomic']}
  colors={['amber']}
  valueFormatter={(v) => `$${formatUsdc(BigInt(v))}`}
  yAxisWidth={64}
  showLegend={false}
  showAnimation
  showGridLines
  startEndOnly={false}
  customTooltip={EarningsTooltip}
  className="h-80 mt-4"
/>
```

- `colors={['amber']}` references the Tailwind color we extended in §3.1.
- `valueFormatter` runs on both Y-axis ticks and tooltip values.
- Date ticks come from the `date` field (`YYYY-MM-DD`); Tremor formats them
  reasonably but you can override with `tickFormatter` if needed:
  `'day'` → hours (`14:00`); `'week'` → weekday (`Mon`); `'month'` → `Apr 12`.

### 19.2 Daily bar chart (alternative view)

```tsx
import { BarChart } from '@tremor/react';

<BarChart
  data={dailySeries}
  index="date"
  categories={['totalAtomic']}
  colors={['amber']}
  valueFormatter={(v) => `$${formatUsdc(BigInt(v))}`}
  yAxisWidth={64}
  showLegend={false}
  showAnimation
  customTooltip={EarningsTooltip}
  className="h-80 mt-4"
/>
```

Same shape, same colors, same tooltip — Tremor swaps the visualization for free.
Useful as a toggle inside the same KPI card.

### 19.3 Mini sparkline (for KPI cards)

```tsx
import { SparkAreaChart } from '@tremor/react';

<SparkAreaChart
  data={last24h}
  index="date"
  categories={['totalAtomic']}
  colors={['amber']}
  className="h-9 w-full"
/>
```

`SparkAreaChart` strips axes, grid, and tooltip by default — exactly what we
want at the bottom of a KPI card.

### 19.4 Two-series chart (when we need a comparison)

E.g. "Your earnings vs. last week" or "Crawler A vs. Crawler B over time":

```tsx
<AreaChart
  data={dailySeries}
  index="date"
  categories={['thisWeek', 'lastWeek']}
  colors={['amber', 'steel']}             // brand primary + brand secondary
  valueFormatter={(v) => `$${formatUsdc(BigInt(v))}`}
  yAxisWidth={64}
  showAnimation
  className="h-80 mt-4"
/>
```

Two colors max. Never reach for a third — if you'd need three, switch to a
small-multiples layout (grid of charts, each with `colors={['amber']}`).

### 19.5 Daily budget bar

Not a Tremor chart — pure HTML/CSS. A horizontal `<div>` with a fill whose width
animates on update via Framer. Color follows the budget thresholds in §17.9.

Tremor *does* ship a `<ProgressBar />` but we want finer color control for the
budget gradient, so roll our own:

```tsx
const ratio = Number(spentAtomic) / Number(spentAtomic + remainingAtomic);
const color = ratio < 0.6 ? 'amber' : ratio < 0.85 ? 'yellow' : 'clay';

<div className="h-2.5 rounded-full bg-elevated overflow-hidden">
  <motion.div
    className={`h-full bg-${color}`}
    initial={{ width: 0 }}
    animate={{ width: `${ratio * 100}%` }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  />
</div>
```

### 19.6 Custom tooltip

Tremor lets you pass a `customTooltip` component receiving `{ payload, active, label }`:

```tsx
import type { CustomTooltipProps } from '@tremor/react';
import { formatUsdc, formatChartDate } from '@/lib/format';

export function EarningsTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload as { date: string; totalAtomic: string; requestCount: number };
  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-strong)' }}
    >
      <div className="text-xs text-[color:var(--text-tertiary)] mb-1">
        {formatChartDate(datum.date, 'absolute')}
      </div>
      <div className="font-mono text-sm text-[color:var(--text-primary)]">
        ${formatUsdc(BigInt(datum.totalAtomic))} USDC
      </div>
      <div className="text-xs text-[color:var(--text-secondary)] mt-1">
        {datum.requestCount} crawl{datum.requestCount === 1 ? '' : 's'}
      </div>
    </div>
  );
}
```

Always pass this via `customTooltip={EarningsTooltip}`. Never ship Tremor's
default tooltip — it ships without our typography and undermines the polish.

### 19.7 Empty chart

When `dailySeries` has zero non-zero entries:

```tsx
<div className="relative h-80">
  <AreaChart {...allTheStandardProps} />
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    <span className="text-sm text-[color:var(--text-tertiary)]">No data in this window yet.</span>
  </div>
</div>
```

Or wrap the whole card with `<EmptyState />` per §17.10 if the card has nothing
else to show.

---

## 20. Required packages

Add exactly these to `apps/web-dashboard/package.json`:

```json
{
  "dependencies": {
    "@crawlpay/types": "workspace:*",
    "@dicebear/collection": "^9.0.0",
    "@dicebear/core": "^9.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@tanstack/react-query": "^5.51.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.456.0",
    "motion": "^11.11.0",
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-hook-form": "^7.53.0",
    "@tremor/react": "^3.18.0",
    "shiki": "^1.22.0",
    "sonner": "^1.7.0",
    "tailwind-merge": "^2.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.4.0"
  }
}
```

Don't add anything not on this list without justifying it in a code comment. Specifically — do NOT add: Recharts directly (Tremor already pulls it as a dep — import from `@tremor/react`), Chart.js, lodash, moment, dayjs (use `Intl.RelativeTimeFormat`), styled-components, emotion, GSAP.
