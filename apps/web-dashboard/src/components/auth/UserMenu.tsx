'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { SignInButton } from './SignInButton';

/**
 * Authenticated user widget for dashboard navs.
 *
 *   - Loading: shows a skeleton pill
 *   - No session: renders the SignInButton
 *   - Signed in: shows truncated address + dropdown with Sign out
 */
export function UserMenu() {
  const { session, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (loading) {
    return <div className="h-9 w-32 animate-pulse rounded-lg bg-bg-elevated" aria-hidden />;
  }

  if (!session) {
    return <SignInButton size="sm" />;
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'mono inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-surface px-3 py-1.5 text-[13px] text-ink-secondary transition-colors',
          'hover:border-border-strong hover:text-ink-primary',
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{truncate(session.address)}</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-lg border border-border-subtle bg-bg-elevated py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-secondary transition-colors hover:bg-bg-surface hover:text-ink-primary"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function truncate(addr: string): string {
  if (!addr) return '';
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
