# CrawlPay — Demo Video Script

**Target length:** 3 minutes 30 seconds (judges prefer ≤ 4 min)
**Target audience:** Hackathon judges from Circle + Ignyte + Arc — assume they know x402 / EIP-3009 / Gateway but DON'T know CrawlPay specifically
**Recording stack:** OBS or Loom; ~1080p; mic + screen capture
**Aspect ratio:** 16:9
**Submit format:** mp4 link (YouTube unlisted or Loom)

## What to convey, in order

1. **The problem** (≤ 25 s) — sub-cent crawl pricing doesn't exist on traditional rails, and Cloudflare's Pay Per Crawl is enterprise-gated.
2. **The product** (≤ 60 s) — landing page, three-line Express snippet, real onboarding flow, ERC-8004 chip.
3. **The proof** (≤ 60 s) — `pnpm demo` running live, receipts flowing into the dashboard, signature verification working.
4. **Why this is Track 4** (≤ 30 s) — recap of which Circle products power which surface.
5. **What's next** (≤ 20 s) — mainnet, plugins, hosted facilitator.

## Scene-by-scene script

### Scene 1 — Cold open (0:00 → 0:15)

**Visual:** CrawlPay landing page (`http://localhost:3000`), hero walkthrough animating in the background.

**Voiceover:**
> A human reads a few pages a day. An AI crawler reads hundreds of thousands. There's no payment rail that makes sense for that — until now. I'm Emmanuel, and this is CrawlPay.

### Scene 2 — The problem (0:15 → 0:40)

**Visual:** Scroll the landing page slowly — show the "Why per-request pricing hasn't existed" section, the pricing comparison table, then the Hero CTA.

**Voiceover:**
> Stripe's 30-cent flat fee makes a $0.0001 charge a 300,000% transaction cost. PayPal's the same. Cloudflare just launched Pay Per Crawl — but only for enterprise customers. So publishers either block AI crawlers or eat the bandwidth. Neither's good.
>
> CrawlPay solves this on three open standards: x402 v2, EIP-3009, and Circle Gateway batched settlement on Arc. The publisher writes three lines of Express. The crawler installs one SDK. Every fetch produces a signed receipt.

### Scene 3 — Publisher onboarding (0:40 → 1:30)

**Visual:** Click "Get started" → `/onboard/publisher`. Walk through the three steps:
- Step 1: Click "Sign in" → Privy modal opens → pick Google (or email) → modal closes
- Step 2: Form appears with wallet address pre-filled — type a domain, pick $0.0001 price
- Step 3: Receipt key reveal screen — point at the warning, show the copyable Express snippet pre-filled with the new publisher id

**Voiceover (talking over the clicks):**
> Real publisher onboarding. Sign in with Google — Privy creates an embedded wallet, no extension needed. Pick a domain, pick a price. The form generates a receipt signing keypair locally in the browser — the server never sees it. Copy the Express snippet, paste it into your app, ship it. The "Test my integration" button hits your domain and validates the 402 response. That's the whole flow.

### Scene 4 — The dashboard (1:30 → 2:15)

**Visual:** Click "Open dashboard" → `/publisher/pub_demoTechnotes`. Show:
- Hero with domain + ERC-8004 chip + Arc Testnet chip
- 4 KPI cards (earnings, paid crawls, unique crawlers, avg per crawl)
- The chart (Day/Week/Month toggle)
- The top crawlers table
- The live receipts feed

**Voiceover:**
> Live publisher dashboard — earnings, top crawlers, full receipts feed. Everything's wired to a real api-gateway backed by Postgres. Click any receipt — there's the canonical JSON. Click "Verify signature" — the backend recovers the signer and confirms. That's portable proof of access; anyone with the receipt and our public key can verify it from outside CrawlPay's database.
>
> The "ERC-8004 #42" chip up top? Read live from Arc Testnet's IdentityRegistry. If the publisher's wallet has a registered agent, it shows up. No cache except a 5-minute hot-path.

### Scene 5 — The proof (2:15 → 3:00)

**Visual:** Terminal split-screen with the dashboard.

```bash
$ pnpm demo
```

Show the per-crawl log lines streaming:
```
[crawl  1/60] ✓ 200 /articles/transformer-scaling-laws · $0.000100 · 312ms
[crawl  2/60] ✓ 200 /research/rlhf-survey-2026         · $0.000100 · 287ms
...
```

Halfway through, switch focus to the dashboard tab — show the live feed populating with new entries, the chart bars filling in, the KPI numbers ticking up.

**Voiceover:**
> One command — `pnpm demo` — spins up a local publisher, fires 60 paid crawls through real Circle Gateway on Arc Testnet, and persists every receipt. Watch the dashboard light up. Each line is a real EIP-3009 authorization, batched off-chain by Gateway, settling to a real Arc address. The whole loop takes about 40 seconds.

### Scene 6 — Why Track 4 (3:00 → 3:20)

**Visual:** Back to README, scroll to the "Hackathon — Circle Product Feedback" section. Highlight the bullets:
- USDC
- Circle Gateway / Nanopayments
- Circle Wallets (via Privy)
- (CCTP planned for v3)

**Voiceover:**
> CrawlPay touches four of the seven Circle products listed in Track 4: USDC for settlement, Gateway for off-chain batching, Wallets for publisher onboarding, and Nanopayments as the entire spine of the protocol. The whole thing is Apache 2.0 — fork it, ship a hosted version, no permission needed.

### Scene 7 — Close (3:20 → 3:35)

**Visual:** Static slide with the GitHub URL + demo URL.

**Voiceover:**
> CrawlPay is open and works today on Arc Testnet. GitHub link in the description. Mainnet, hosted facilitator with a 2.5% fee, and Ghost / WordPress plugins are next. Thanks for watching.

## Recording checklist

- [ ] Local stack running: `pnpm infra:up`, `pnpm --filter @crawlpay/api-gateway dev`, `pnpm web:dev`
- [ ] Privy app ID set in `.env` (otherwise sign-in shows "(not configured)")
- [ ] Smoke buyer ran once so Gateway has USDC deposited
- [ ] Cleared browser cache for `localhost:3000` — onboarding should start fresh
- [ ] Demo terminal pre-staged with `pnpm demo` ready to fire
- [ ] OBS scenes pre-configured: full-screen browser, terminal+browser split, static slide
- [ ] Audio levels checked — no clipping, no background hum
- [ ] Cursor highlight enabled in OBS so clicks are visible
- [ ] First-pass record full take; second pass to fix any flubs

## Common pitfalls during recording

- **Don't show .env in screen.** Privacy + the receipt private key.
- **Hide notifications.** Slack/iMessage pop-ups during recording look unprofessional.
- **Browser zoom at 110%.** Small text becomes unreadable when YouTube compresses to 720p.
- **Demo terminal: explicitly clear before running** (`clear`). Old output is visual noise.
- **Time the dashboard switch in Scene 5.** Switch focus when 5-10 crawls have landed so judges see motion, not an empty feed.
- **Receipt modal Verify button.** If the api-gateway is down, the click fails silently — do a dry run first.

## After recording

1. Upload to YouTube as **Unlisted** (so it's not public-public but the judges can watch via direct link)
2. Add the link to `docs/SUBMISSION.md` under "Video demonstration"
3. Add the link to the README's hackathon section
4. Submit
