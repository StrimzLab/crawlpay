'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Globe, KeyRound, Loader2, Sparkles } from 'lucide-react';
import { generatePrivateKey } from 'viem/accounts';
import type { Hex } from 'viem';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { SignInButton } from '@/components/auth/SignInButton';
import {
  createPublisher,
  PublishersApiError,
  type PublisherRecord,
} from '@/lib/api/publishers';
import { SetupInstructions } from './SetupInstructions';

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

type Step = 'connect' | 'form' | 'setup';

const PRICE_TIERS = [
  { atomic: 100, label: '$0.0001', hint: 'High-volume traffic' },
  { atomic: 1000, label: '$0.001', hint: 'Default — about 10× a basic API call' },
  { atomic: 10000, label: '$0.01', hint: 'Premium · curated research' },
] as const;

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] },
} as const;

export function PublisherOnboarding() {
  const { session, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>('connect');
  const [domain, setDomain] = useState('');
  const [priceAtomic, setPriceAtomic] = useState<number>(1000);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    publisher: PublisherRecord;
    receiptKey: Hex;
  } | null>(null);

  // Auto-advance from 'connect' to 'form' once we have a session.
  useEffect(() => {
    if (session && step === 'connect') setStep('form');
  }, [session, step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!DOMAIN_RE.test(domain.trim())) {
      setError('Domain must look like example.com (no scheme, no path).');
      return;
    }
    setSubmitting(true);
    try {
      // Generate the receipt signing keypair client-side. The server never
      // sees this — the publisher copies it from the next screen and stores
      // it in their own .env. If they lose it, they rotate.
      const receiptKey = generatePrivateKey();

      const publisher = await createPublisher({
        domain: domain.trim().toLowerCase(),
        defaultPriceAtomic: priceAtomic,
        description: description.trim() || undefined,
      });

      setCreated({ publisher, receiptKey });
      setStep('setup');
    } catch (err) {
      if (err instanceof PublishersApiError) {
        if (err.code === 'already_exists') {
          setError(`A publisher already exists for "${domain.trim().toLowerCase()}".`);
        } else if (err.code === 'invalid_domain') {
          setError('Domain rejected by the server — double-check the format.');
        } else if (err.code === 'not_authenticated') {
          setError('Your session expired. Sign in again.');
          setStep('connect');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 md:py-16">
      <StepperHeader currentStep={step} />

      <AnimatePresence mode="wait">
        {step === 'connect' && (
          <motion.div key="connect" {...fadeIn}>
            <ConnectStep authLoading={authLoading} />
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div key="form" {...fadeIn}>
            <FormStep
              walletAddress={session?.address ?? ''}
              domain={domain}
              setDomain={setDomain}
              priceAtomic={priceAtomic}
              setPriceAtomic={setPriceAtomic}
              description={description}
              setDescription={setDescription}
              submitting={submitting}
              error={error}
              onSubmit={handleSubmit}
            />
          </motion.div>
        )}

        {step === 'setup' && created && (
          <motion.div key="setup" {...fadeIn}>
            <SetupInstructions
              publisher={created.publisher}
              receiptPrivateKey={created.receiptKey}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepperHeader({ currentStep }: { currentStep: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'connect', label: 'Connect' },
    { key: 'form', label: 'Configure' },
    { key: 'setup', label: 'Install' },
  ];
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <ol className="mb-10 flex items-center gap-2 text-[12px] text-ink-tertiary">
      {steps.map((s, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                done && 'bg-sage text-bg-base',
                active && 'bg-accent text-[#0A0A0B]',
                !done && !active && 'border border-border-subtle text-ink-tertiary',
              )}
            >
              {i + 1}
            </span>
            <span
              className={cn(
                'transition-colors',
                (done || active) && 'text-ink-primary',
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-2 h-px w-8 bg-border-subtle" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ConnectStep({ authLoading }: { authLoading: boolean }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Chip variant="accent" className="self-start">
          <Sparkles className="h-3 w-3" aria-hidden />
          Open a CrawlPay publisher
        </Chip>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Connect a wallet to start.
        </h1>
        <p className="lead text-ink-secondary">
          Your wallet is the publisher account. Funds settle to it. Email or Google login generates
          one for you if you don&rsquo;t have one yet — no extension required.
        </p>
      </div>

      <div className="rounded-card border border-border-subtle bg-bg-surface p-6">
        <SignInButton size="lg" className="w-full sm:w-auto" />
        {authLoading && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-tertiary">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Checking session…
          </p>
        )}
      </div>

      <ul className="space-y-2 text-sm text-ink-tertiary">
        <li className="flex items-start gap-2">
          <span aria-hidden>·</span>
          <span>We never custody funds. Settlement goes directly to your wallet.</span>
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden>·</span>
          <span>The receipt signing key is generated locally in step 3 — we don&rsquo;t store it.</span>
        </li>
        <li className="flex items-start gap-2">
          <span aria-hidden>·</span>
          <span>Free during v0 testnet · 2.5% only when you opt into hosted v1 on mainnet.</span>
        </li>
      </ul>
    </div>
  );
}

type FormStepProps = {
  walletAddress: string;
  domain: string;
  setDomain: (s: string) => void;
  priceAtomic: number;
  setPriceAtomic: (n: number) => void;
  description: string;
  setDescription: (s: string) => void;
  submitting: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
};

function FormStep(props: FormStepProps) {
  const {
    walletAddress,
    domain,
    setDomain,
    priceAtomic,
    setPriceAtomic,
    description,
    setDescription,
    submitting,
    error,
    onSubmit,
  } = props;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          What are you monetizing?
        </h1>
        <p className="lead text-ink-secondary">
          Three quick fields and you&rsquo;re live on Arc Testnet.
        </p>
      </header>

      <div className="rounded-card border border-border-subtle bg-bg-surface p-5">
        <Field label="Receiving wallet" hint="From your signed-in session — funds settle here.">
          <div className="mono inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-[13px] text-ink-secondary">
            <KeyRound className="h-3.5 w-3.5 text-accent" aria-hidden />
            {walletAddress}
          </div>
        </Field>
      </div>

      <Field label="Domain you want to monetize" required>
        <div className="relative">
          <Globe
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-tertiary"
            aria-hidden
          />
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="technotes.example.com"
            required
            autoComplete="off"
            spellCheck={false}
            className="mono w-full rounded-lg border border-border-subtle bg-bg-surface py-2.5 pl-9 pr-3 text-[14px] text-ink-primary placeholder:text-ink-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <p className="mt-1 text-[12px] text-ink-tertiary">
          No scheme, no path — just the host.
        </p>
      </Field>

      <Field label="Default price per crawl" required>
        <div className="grid grid-cols-3 gap-2">
          {PRICE_TIERS.map((tier) => {
            const active = tier.atomic === priceAtomic;
            return (
              <button
                key={tier.atomic}
                type="button"
                onClick={() => setPriceAtomic(tier.atomic)}
                aria-pressed={active}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left transition-colors',
                  active
                    ? 'border-accent bg-[color:var(--accent-subtle)]'
                    : 'border-border-subtle bg-bg-surface hover:border-border-strong',
                )}
              >
                <div className={cn('mono text-[14px]', active ? 'text-accent' : 'text-ink-primary')}>
                  {tier.label}
                </div>
                <div className="mt-0.5 text-[11.5px] text-ink-tertiary">{tier.hint}</div>
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-[12px] text-ink-tertiary">
          You can override per-path later with pricing rules.
        </p>
      </Field>

      <Field label="Description" optional>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Short note about what you publish (shown on the public profile)"
          className="w-full resize-none rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5 text-[14px] text-ink-primary placeholder:text-ink-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </Field>

      {error && (
        <div role="alert" className="rounded-md border border-clay/40 bg-[color:rgba(136,69,79,0.06)] px-3 py-2 text-sm text-clay">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="h-4 w-4" aria-hidden />
          )}
          {submitting ? 'Creating…' : 'Create publisher'}
        </Button>
        <span className="text-xs text-ink-tertiary">
          We generate your receipt signing key on the next step. Locally. We don&rsquo;t see it.
        </span>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-sm font-medium text-ink-primary">
        {label}
        {required && <span className="text-accent">*</span>}
        {optional && <span className="text-[11px] font-normal text-ink-tertiary">(optional)</span>}
      </span>
      {children}
      {hint && <p className="text-[12px] text-ink-tertiary">{hint}</p>}
    </label>
  );
}
