import Link from 'next/link';
import { Github } from 'lucide-react';
import { Logo } from '@/components/brand';
import { Chip } from '@/components/ui/Chip';
import { UserMenu } from '@/components/auth/UserMenu';

const GITHUB_URL = 'https://github.com/StrimzLab/crawlpay';

type DashNavProps = {
  /** Network chip label override — defaults to "Arc Testnet". */
  network?: string;
};

/**
 * Top nav variant for dashboard pages.
 *
 * The static address chip from Phase 3 has been replaced with the live
 * UserMenu — when signed in it shows the connected address + dropdown
 * (Sign out); when signed out it shows a SignInButton.
 */
export function DashNav({ network = 'Arc Testnet' }: DashNavProps) {
  return (
    <header className="sticky top-0 z-50 h-[var(--nav-h)] border-b border-border-subtle bg-[color:var(--bg-overlay)] backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-none items-center justify-between gap-4 px-6 md:px-8">
        <Link
          href="/"
          aria-label="CrawlPay home"
          className="text-accent transition-colors hover:text-accent-hover"
        >
          <Logo variant="lockup" className="h-7 w-auto" />
        </Link>

        <nav className="flex items-center gap-3">
          <Chip variant="mono" dot="steel" className="hidden sm:inline-flex">
            {network}
          </Chip>
          <Link
            href="/demo"
            className="hidden rounded-lg px-3 py-2 text-sm text-ink-secondary transition-colors hover:text-ink-primary sm:inline-flex"
          >
            Demo
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ink-secondary transition-colors hover:text-ink-primary sm:inline-flex"
          >
            <Github className="h-[14px] w-[14px]" aria-hidden />
            <span>GitHub</span>
          </a>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}
