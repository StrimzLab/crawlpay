'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check, Copy, Loader2, Play, ShieldAlert } from 'lucide-react';
import { privateKeyToAddress } from 'viem/accounts';
import type { Hex } from 'viem';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';
import {
  probePublisher,
  PublishersApiError,
  type ProbeResult,
  type PublisherRecord,
} from '@/lib/api/publishers';

type SetupInstructionsProps = {
  publisher: PublisherRecord;
  /** Receipt signing key generated client-side. Never sent to the server. */
  receiptPrivateKey: Hex;
};

/**
 * Final step of the onboarding flow.
 *
 *   1. One-time reveal of the receipt signing key — warns the user this is
 *      their only chance to copy it. We don't persist it anywhere.
 *   2. Copyable install command + Express middleware snippet pre-filled with
 *      the publisher's id, wallet, and price.
 *   3. .env block ready to paste, with the receipt key embedded.
 *   4. "Test my integration" — runs a server-side probe of the domain.
 *   5. "Open dashboard" CTA.
 */
export function SetupInstructions({ publisher, receiptPrivateKey }: SetupInstructionsProps) {
  const receiptAddress = privateKeyToAddress(receiptPrivateKey);

  const installCmd = 'pnpm add @crawlpay/proxy-middleware @crawlpay/receipt-signer @crawlpay/types';

  const expressCode = `import express from 'express';
import { crawlpay } from '@crawlpay/proxy-middleware';
import { PrivateKeyReceiptSigner } from '@crawlpay/receipt-signer';
import { dollarsToAtomic } from '@crawlpay/types';

const app = express();

app.use(crawlpay({
  publisherId: '${publisher.id}',
  publisherWallet: '${publisher.walletAddress}',
  network: 'arcTestnet',
  defaultPrice: ${publisher.defaultPriceAtomic}n,
  receiptSigner: new PrivateKeyReceiptSigner(
    process.env.CRAWLPAY_RECEIPT_PRIVATE_KEY as \`0x\${string}\`,
  ),
}));

app.get('/articles/:slug', (req, res) => {
  res.send('<article>…</article>');
});

app.listen(3000);
`;

  const envBlock = `# CrawlPay receipt signing key
# Signer address: ${receiptAddress}
# Save this — we don't store it, and there's no "show again" button.
CRAWLPAY_RECEIPT_PRIVATE_KEY=${receiptPrivateKey}
`;

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <Chip variant="accent" dot="success">
          Publisher created · {publisher.id}
        </Chip>
        <h2 className="text-2xl font-semibold tracking-tight">
          You&rsquo;re three minutes from your first paid crawl.
        </h2>
        <p className="text-ink-secondary">
          Save the signing key below, paste the middleware into your Express app, then probe your
          domain. We&rsquo;ll watch the receipts roll in.
        </p>
      </header>

      <ReceiptKeyReveal privateKey={receiptPrivateKey} signerAddress={receiptAddress} />

      <Section index="1" title="Install the SDK">
        <CodeBlock code={installCmd} language="bash" />
      </Section>

      <Section index="2" title="Add the middleware">
        <CodeBlock code={expressCode} language="ts" />
      </Section>

      <Section index="3" title="Configure your .env">
        <CodeBlock code={envBlock} language="bash" />
      </Section>

      <ProbeSection publisherId={publisher.id} domain={publisher.domain} />

      <div className="flex flex-wrap items-center gap-3 pt-4">
        <Link href={`/publisher/${publisher.id}`} prefetch={false}>
          <Button size="lg">
            Open dashboard
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
        <span className="text-sm text-ink-tertiary">
          You can come back anytime — your wallet is the key.
        </span>
      </div>
    </div>
  );
}

function ReceiptKeyReveal({
  privateKey,
  signerAddress,
}: {
  privateKey: Hex;
  signerAddress: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-card border border-clay/40 bg-[color:rgba(136,69,79,0.06)] p-5">
      <div className="mb-2 flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-clay" strokeWidth={1.75} aria-hidden />
        <span className="text-sm font-semibold text-clay">
          Save this signing key — we don&rsquo;t store it
        </span>
      </div>
      <p className="mb-4 text-sm leading-[1.6] text-ink-secondary">
        Generated locally in your browser. Used to sign receipts so crawlers can verify they paid.
        Lose it and you&rsquo;ll have to rotate — not the end of the world but mildly annoying.
      </p>
      <div className="mono break-all rounded-lg border border-border-subtle bg-bg-base px-4 py-3 text-[13px] text-ink-primary">
        {privateKey}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-ink-tertiary">
        <span>
          Signer address: <span className="mono text-ink-secondary">{signerAddress}</span>
        </span>
        <button
          type="button"
          onClick={copy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition-colors',
            copied
              ? 'border-sage/40 text-sage'
              : 'border-border-subtle text-ink-secondary hover:border-border-strong hover:text-ink-primary',
          )}
        >
          {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
          {copied ? 'Copied' : 'Copy key'}
        </button>
      </div>
    </div>
  );
}

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="mono text-[11px] text-ink-tertiary">{index}</span>
        <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function CodeBlock({ code, language }: { code: string; language: 'bash' | 'ts' }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative">
      <pre
        className="mono overflow-x-auto rounded-card border border-border-subtle bg-[#0B1015] px-4 py-3.5 text-[12.5px] leading-[1.65] text-ink-secondary"
        aria-label={`Code block (${language})`}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className={cn(
          'absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] transition-all',
          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
          copied
            ? 'border-sage/40 text-sage'
            : 'border-border-subtle bg-bg-surface text-ink-secondary hover:text-ink-primary',
        )}
        aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      >
        {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function ProbeSection({ publisherId, domain }: { publisherId: string; domain: string }) {
  const [probing, setProbing] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runProbe() {
    setProbing(true);
    setError(null);
    setResult(null);
    try {
      const r = await probePublisher(publisherId);
      setResult(r);
    } catch (err) {
      if (err instanceof PublishersApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProbing(false);
    }
  }

  return (
    <section className="space-y-3 rounded-card border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className="mono text-[11px] text-ink-tertiary">4</span>
        <h3 className="text-[15px] font-semibold tracking-tight">Test the middleware</h3>
      </div>
      <p className="text-sm leading-[1.55] text-ink-secondary">
        We&rsquo;ll hit{' '}
        <code className="mono text-accent">https://{domain}/__crawlpay-probe-…</code> and check
        for a 402 with the Payment-Required header.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={runProbe} disabled={probing} variant="secondary">
          {probing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Play className="h-4 w-4" aria-hidden />
          )}
          {probing ? 'Probing…' : 'Run probe'}
        </Button>
        {result && (
          <Chip dot={result.ok ? 'success' : 'warning'}>
            {result.ok ? 'Integration looks good' : `Status ${result.status}`}
          </Chip>
        )}
      </div>
      {result && (
        <div
          className={cn(
            'rounded-md border px-3 py-2 text-sm',
            result.ok
              ? 'border-sage/30 bg-[color:rgba(126,166,109,0.06)] text-sage'
              : 'border-amber-500/30 bg-[color:rgba(232,169,107,0.06)] text-ink-secondary',
          )}
        >
          {result.detail}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-clay/40 bg-[color:rgba(136,69,79,0.06)] px-3 py-2 text-sm text-clay"
        >
          <AlertTriangle className="mt-[2px] h-4 w-4" aria-hidden />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
