'use client';

import { useState } from 'react';
import { PrivyProvider } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';

/**
 * Root client-side providers. Mounted once in app/layout.tsx.
 *
 *   - QueryClientProvider for TanStack Query (Phase 5c will use this for the
 *     dashboard's live data fetches).
 *   - PrivyProvider for embedded wallets + social login. Branded with our
 *     accent color and dark theme.
 *
 * If NEXT_PUBLIC_PRIVY_APP_ID is unset, Privy still mounts (with a stub ID)
 * so the React tree is consistent. Sign-in will fail with a clear error, and
 * `useAuth()` returns the unauthenticated state. Local dev without a Privy
 * account just means the auth surface is non-functional; everything else
 * (landing, dashboards in read mode, demo) works.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            retry: 1,
          },
        },
      }),
  );

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID || 'crawlpay-stub-app-id'}
      config={{
        loginMethods: ['email', 'wallet', 'google'],
        appearance: {
          theme: 'dark',
          accentColor: '#E8A96B',
          logo: '/brand/lockup.svg',
          showWalletLoginFirst: false,
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </PrivyProvider>
  );
}
