/**
 * Typed client for the api-gateway's /publishers/* endpoints.
 *
 * All requests go through the /api/* rewrite (next.config.ts) so the session
 * cookie set by /auth/login flows through transparently.
 */

const BASE = '/api/publishers';

export interface PublisherRecord {
  id: string;
  domain: string;
  walletAddress: string;
  network: string;
  defaultPriceAtomic: string;
  description?: string;
  minReputationScore: number;
  robotsTxtAware: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePublisherBody {
  domain: string;
  defaultPriceAtomic: string | number;
  description?: string;
  /** Optional id override; otherwise the server derives one from `domain`. */
  id?: string;
}

export interface ProbeResult {
  ok: boolean;
  status: number;
  hasPaymentHeader: boolean;
  detail: string;
  url: string;
}

export class PublishersApiError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
    public readonly status?: number,
  ) {
    super(message ?? code);
    this.name = 'PublishersApiError';
  }
}

async function readError(res: Response): Promise<PublishersApiError> {
  let code = `status_${res.status}`;
  let detail: string | undefined;
  try {
    const body = (await res.json()) as { error?: string; detail?: string };
    code = body.error ?? code;
    detail = body.detail;
  } catch {
    // not JSON
  }
  return new PublishersApiError(code, detail, res.status);
}

export async function createPublisher(body: CreatePublisherBody): Promise<PublisherRecord> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await readError(res);
  const data = (await res.json()) as { publisher: PublisherRecord };
  return data.publisher;
}

export async function getPublisher(id: string): Promise<PublisherRecord | null> {
  const res = await fetch(`${BASE}/${id}`, { credentials: 'include' });
  if (res.status === 404) return null;
  if (!res.ok) throw await readError(res);
  const data = (await res.json()) as { publisher: PublisherRecord };
  return data.publisher;
}

export async function probePublisher(id: string): Promise<ProbeResult> {
  const res = await fetch(`${BASE}/${id}/probe`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw await readError(res);
  return (await res.json()) as ProbeResult;
}
