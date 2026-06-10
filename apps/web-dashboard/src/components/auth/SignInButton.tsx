'use client';

import { useState } from 'react';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

type SignInButtonProps = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function SignInButton({ className, size = 'md' }: SignInButtonProps) {
  const { signIn, loading, walletConnected, ready, privyConfigured } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    try {
      await signIn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  }

  const label = !ready
    ? 'Loading…'
    : !privyConfigured
      ? 'Sign in (not configured)'
      : !walletConnected
        ? 'Connect wallet'
        : 'Sign in';

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        onClick={handleClick}
        disabled={loading || !ready}
        size={size}
        className={className}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden />
        )}
        {label}
      </Button>
      {error && (
        <span className="text-xs text-clay" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
