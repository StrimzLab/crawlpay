'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { SiweMessage } from 'siwe';
import * as authApi from '@/lib/api/auth';

const SIWE_CHAIN_ID = 5042002; // Arc Testnet
const SIWE_STATEMENT = 'Sign in to CrawlPay';
const PRIVY_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

export interface AuthState {
  /** Backend session (from the /auth/me cookie). Null when signed out. */
  session: { address: string } | null;
  /** True while hydrating the session on mount or running the SIWE flow. */
  loading: boolean;
  /** True once Privy's SDK has finished initializing. */
  ready: boolean;
  /** Whether a Privy wallet is connected (does not imply backend session). */
  walletConnected: boolean;
  /** Connected wallet address (lowercased), or null. */
  walletAddress: string | null;
  /** True if Privy app ID isn't configured — sign-in surface should show a hint. */
  privyConfigured: boolean;
}

export interface AuthActions {
  /**
   * Single button click handler: opens the Privy modal if no wallet is
   * connected, otherwise runs the SIWE flow and registers a backend session.
   * Call again after Privy connects to complete sign-in.
   */
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthState & AuthActions {
  const { login: privyLogin, logout: privyLogout, ready, authenticated, user, signMessage } =
    usePrivy();

  const [session, setSession] = useState<{ address: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate the session from the cookie on mount.
  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const walletAddress = user?.wallet?.address?.toLowerCase() ?? null;

  const signIn = useCallback(async () => {
    if (!PRIVY_CONFIGURED) {
      throw new authApi.AuthError(
        'privy_not_configured',
        'Set NEXT_PUBLIC_PRIVY_APP_ID and restart the dev server.',
      );
    }
    setLoading(true);
    try {
      // Step 1: ensure Privy is authenticated. If not, open the modal and
      // bail — the user signs in via Privy, then re-clicks our sign-in button
      // to continue the SIWE flow.
      if (!authenticated || !walletAddress) {
        await privyLogin();
        return;
      }

      // Step 2: ask the api-gateway for a fresh nonce.
      const nonce = await authApi.getNonce();

      // Step 3: build a SIWE message.
      const message = new SiweMessage({
        domain: window.location.host,
        address: walletAddress,
        statement: SIWE_STATEMENT,
        uri: window.location.origin,
        version: '1',
        chainId: SIWE_CHAIN_ID,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }).prepareMessage();

      // Step 4: sign via Privy (handles embedded wallets + injected wallets).
      const result = await signMessage({ message });
      const signature = typeof result === 'string' ? result : result.signature;

      // Step 5: post message + signature to the api-gateway. Cookie is set
      // server-side on success.
      const next = await authApi.login(message, signature);
      setSession(next);
    } finally {
      setLoading(false);
    }
  }, [authenticated, privyLogin, signMessage, walletAddress]);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await authApi.logout();
      if (authenticated) await privyLogout();
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [authenticated, privyLogout]);

  return {
    session,
    loading,
    ready,
    walletConnected: authenticated,
    walletAddress,
    privyConfigured: PRIVY_CONFIGURED,
    signIn,
    signOut,
  };
}
