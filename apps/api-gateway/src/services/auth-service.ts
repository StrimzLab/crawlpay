import { SiweMessage } from 'siwe';
import type { Address } from 'viem';
import type { AuthNonceStore } from './nonce-store';
import type { SessionStore } from './session-store';

export interface AuthServiceConfig {
  /** Domain that must match the SIWE message domain field. E.g. "localhost:3000" or "crawlpay.xyz". */
  domain: string;
  /** Allowed chain IDs for the SIWE message. Defaults to Arc Testnet only. */
  allowedChainIds: number[];
  /** Statement string clients should put in the SIWE message — informational only. */
  statement?: string;
}

export type VerifyResult =
  | { ok: true; sid: string; address: Address }
  | { ok: false; error: VerifyError };

export type VerifyError =
  | 'malformed_message'
  | 'domain_mismatch'
  | 'unsupported_chain'
  | 'invalid_or_used_nonce'
  | 'signature_invalid'
  | 'expired';

export interface AuthService {
  issueNonce(): Promise<string>;
  verifyAndCreateSession(message: string, signature: string): Promise<VerifyResult>;
  readSession(sid: string): Promise<{ address: Address } | null>;
  destroySession(sid: string): Promise<void>;
}

/**
 * SIWE (EIP-4361) authentication backed by injected nonce + session stores.
 *
 * The flow:
 *   1. Client requests a nonce via /auth/nonce
 *   2. Client constructs a SIWE message including that nonce
 *   3. User signs the message in their wallet
 *   4. Client posts { message, signature } to /auth/login
 *   5. This service:
 *      - parses the message
 *      - validates domain + chain + nonce
 *      - verifies the signature recovers to the message's address
 *      - on success: consumes the nonce, mints a session ID, returns it
 *
 * The route layer wraps the SID in an HTTP-only cookie.
 */
export class SiweAuthService implements AuthService {
  constructor(
    private readonly nonces: AuthNonceStore,
    private readonly sessions: SessionStore,
    private readonly config: AuthServiceConfig,
  ) {}

  async issueNonce(): Promise<string> {
    return this.nonces.create();
  }

  async verifyAndCreateSession(message: string, signature: string): Promise<VerifyResult> {
    let siwe: SiweMessage;
    try {
      siwe = new SiweMessage(message);
    } catch {
      return { ok: false, error: 'malformed_message' };
    }

    if (siwe.domain !== this.config.domain) {
      return { ok: false, error: 'domain_mismatch' };
    }

    if (!this.config.allowedChainIds.includes(siwe.chainId)) {
      return { ok: false, error: 'unsupported_chain' };
    }

    // Consume the nonce BEFORE verifying the signature. If signature verify fails
    // afterward, the nonce is still burned — a small UX cost (user must request
    // a fresh nonce) but prevents an attacker from grinding signatures against
    // a stable nonce.
    const nonceOk = await this.nonces.consume(siwe.nonce);
    if (!nonceOk) {
      return { ok: false, error: 'invalid_or_used_nonce' };
    }

    let verification;
    try {
      verification = await siwe.verify({ signature });
    } catch {
      return { ok: false, error: 'signature_invalid' };
    }

    if (!verification.success) {
      // siwe.verify() throws on expiration; this branch covers other failures.
      return { ok: false, error: 'signature_invalid' };
    }

    const address = siwe.address.toLowerCase() as Address;
    const sid = await this.sessions.create(address);
    return { ok: true, sid, address };
  }

  async readSession(sid: string): Promise<{ address: Address } | null> {
    const payload = await this.sessions.read(sid);
    return payload ? { address: payload.address } : null;
  }

  async destroySession(sid: string): Promise<void> {
    await this.sessions.destroy(sid);
  }
}
