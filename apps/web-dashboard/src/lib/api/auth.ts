/**
 * Thin client for the api-gateway's /auth/* endpoints.
 *
 * All requests go through Next.js's /api/:path* rewrite (configured in
 * next.config.ts) so the browser sees same-origin requests. That lets the
 * httpOnly session cookie set by the api-gateway round-trip without any
 * cross-origin cookie ceremony.
 */

const BASE = '/api/auth';

export interface AuthSession {
  /** Lowercase 0x-prefixed wallet address. */
  address: string;
}

export class AuthError extends Error {
  constructor(public readonly code: string, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

export async function getNonce(): Promise<string> {
  const res = await fetch(`${BASE}/nonce`, { credentials: 'include' });
  if (!res.ok) throw new AuthError(`nonce_request_failed_${res.status}`);
  const { nonce } = (await res.json()) as { nonce: string };
  return nonce;
}

export async function login(message: string, signature: string): Promise<AuthSession> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) {
    let detail = `status_${res.status}`;
    try {
      const body = await res.json();
      detail = (body?.error as string) ?? detail;
    } catch {
      // not JSON
    }
    throw new AuthError(detail);
  }
  return (await res.json()) as AuthSession;
}

export async function me(): Promise<AuthSession | null> {
  const res = await fetch(`${BASE}/me`, { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new AuthError(`me_failed_${res.status}`);
  return (await res.json()) as AuthSession;
}

export async function logout(): Promise<void> {
  await fetch(`${BASE}/logout`, { method: 'POST', credentials: 'include' });
}
