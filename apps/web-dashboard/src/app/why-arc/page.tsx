import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { SiteNav } from '@/components/ui/SiteNav';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { ButtonLink } from '@/components/ui/ButtonLink';

export const metadata: Metadata = {
  title: 'Why Arc — CrawlPay',
  description:
    'Sub-cent payments need sub-cent settlement. Why Circle Gateway + Arc is the only chain where pay-per-crawl economics work.',
};

const MATH = [
  { value: '$0.006', tone: 'success' as const, label: 'Revenue', sub: '60 fetches × $0.0001' },
  {
    value: '$6 — $60+',
    tone: 'error' as const,
    label: 'Ethereum gas',
    sub: '60 transactions, volatile ETH',
  },
  {
    value: '$0.30',
    tone: 'error' as const,
    label: 'Base gas',
    sub: '60 transactions, ~$0.005 each',
  },
  {
    value: '~$0',
    tone: 'win' as const,
    label: 'Arc + Circle Gateway',
    sub: 'one batch tx · gas paid in USDC',
  },
];

const COMPARISON = [
  {
    chain: 'Ethereum',
    token: 'ETH (volatile)',
    gas: '$1 — $20',
    min: '~$5+',
    sub: { text: '✗', cls: 'text-clay' },
  },
  {
    chain: 'Base',
    token: 'ETH',
    gas: '~$0.005',
    min: '~$0.05+',
    sub: { text: 'borderline', cls: 'text-[color:var(--warning)]' },
  },
  {
    chain: 'Polygon',
    token: 'MATIC',
    gas: '~$0.001',
    min: '~$0.01',
    sub: { text: 'borderline', cls: 'text-[color:var(--warning)]' },
  },
  {
    chain: 'Arc + Circle Gateway',
    token: 'USDC',
    gas: '~$0 (batched)',
    min: '$0.000001',
    sub: { text: '✓', cls: 'text-sage font-semibold' },
    win: true,
  },
];

const FLOW = [
  {
    n: '01',
    t: 'Crawler signs',
    p: 'An off-chain EIP-3009 USDC authorization. No gas, no on-chain write.',
  },
  {
    n: '02',
    t: 'Facilitator verifies',
    p: 'Signature + budget checks happen instantly, off-chain.',
  },
  {
    n: '03',
    t: 'Gateway batches',
    p: 'Thousands of authorizations are pooled into one transfer set.',
  },
  { n: '04', t: 'Arc finalizes', p: 'A single Arc tx settles the whole batch; gas paid in USDC.' },
  {
    n: '05',
    t: 'Receipts issued',
    p: 'Each payer gets a portable, independently verifiable receipt.',
  },
];

export default function WhyArcPage() {
  return (
    <>
      <SiteNav />
      <main>
        {/* HERO */}
        <section className="relative overflow-hidden pt-20 pb-14">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 80% 90%, rgba(232,169,107,.08), transparent 55%)',
            }}
            aria-hidden
          />
          <div className="wrap relative z-10">
            <span className="eyebrow">The economics</span>
            <h1 className="h1 max-w-[18ch]">Why Arc is the only chain where this works.</h1>
            <p className="lead mt-5 max-w-[54ch]">
              Sub-cent payments need sub-cent settlement. Everywhere else, gas eats the payment
              before it reaches the publisher.
            </p>
          </div>
        </section>

        {/* THE MATH */}
        <section className="section pt-6">
          <div className="wrap">
            <span className="eyebrow">The math · 60 fetches</span>
            <h2 className="h2 mb-8">One crawl session, four chains.</h2>
            <div className="grid grid-cols-1 overflow-hidden rounded-modal border border-border-subtle sm:grid-cols-2 lg:grid-cols-4">
              {MATH.map((cell, i) => (
                <div
                  key={cell.label}
                  className={
                    'border-border-subtle p-8 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-b-0 ' +
                    (i < MATH.length - 1 ? 'sm:[&:nth-child(odd)]:border-r lg:[&]:border-r ' : '') +
                    (cell.tone === 'win' ? 'bg-[color:var(--accent-subtle)]' : '')
                  }
                >
                  <div
                    className={
                      'num-display text-[40px] md:text-[42px] ' +
                      (cell.tone === 'success'
                        ? 'text-sage'
                        : cell.tone === 'error'
                          ? 'text-clay'
                          : 'text-accent')
                    }
                  >
                    {cell.value}
                  </div>
                  <div className="mt-3 text-[13px] leading-[1.4] text-ink-secondary">
                    <span className="block font-medium text-ink-primary">{cell.label}</span>
                    {cell.sub}
                  </div>
                </div>
              ))}
            </div>
            <p className="lead mt-6 max-w-[60ch]">
              On every chain but Arc, settling 60 sub-cent payments costs more than the payments are
              worth. Batching plus USDC-denominated gas is what makes the unit economics work.
            </p>
          </div>
        </section>

        {/* COMPARISON TABLE */}
        <section className="section pt-0">
          <div className="wrap">
            <span className="eyebrow">Side by side</span>
            <h2 className="h2 mb-6">The settlement gap</h2>
            <div className="rounded-card border border-border-subtle bg-bg-surface px-2 pb-4 pt-2">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      {[
                        'Chain',
                        'Gas token',
                        'Avg per-tx gas',
                        'Min viable payment',
                        'Sub-cent?',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 pb-3.5 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-ink-tertiary"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row) => (
                      <tr
                        key={row.chain}
                        className={
                          row.win
                            ? 'bg-[color:var(--accent-subtle)] [&>td:first-child]:shadow-[inset_3px_0_0_var(--accent)] [&>td:first-child]:font-semibold [&>td:first-child]:text-accent'
                            : 'border-t border-border-subtle'
                        }
                      >
                        <td
                          className={
                            'p-4 text-sm ' + (row.win ? 'text-accent' : 'text-ink-primary')
                          }
                        >
                          {row.chain}
                        </td>
                        <td className="p-4 text-sm text-ink-secondary">{row.token}</td>
                        <td className="mono p-4 text-sm text-ink-secondary">{row.gas}</td>
                        <td className="mono p-4 text-sm text-ink-secondary">{row.min}</td>
                        <td className={'p-4 text-sm ' + row.sub.cls}>{row.sub.text}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* HOW BATCHING WORKS */}
        <section className="section pt-0">
          <div className="wrap">
            <span className="eyebrow">Under the hood</span>
            <h2 className="h2 mb-2">How batching works</h2>
            <p className="lead mb-8 max-w-[54ch]">
              Thousands of off-chain authorizations collapse into a single on-chain transaction, the
              cost is amortized to almost nothing.
            </p>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
              {FLOW.map((node) => (
                <div
                  key={node.n}
                  className="rounded-card border border-border-subtle bg-bg-surface p-5"
                >
                  <span className="mono text-[11px] text-accent">{node.n}</span>
                  <h4 className="mt-1.5 text-[14.5px] font-semibold">{node.t}</h4>
                  <p className="mt-1 text-[12.5px] leading-[1.45] text-ink-secondary">{node.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA STRIP */}
        <section className="border-y border-border-subtle bg-bg-elevated py-20 text-center">
          <div className="wrap">
            <h2 className="h2 mb-6">The math checks out. Add it to your site.</h2>
            <ButtonLink href="https://github.com/StrimzLab/crawlpay" external size="lg">
              Add CrawlPay to your site
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <p className="mono mt-5 text-sm text-ink-secondary">
              Free during testnet · self-host anytime
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
