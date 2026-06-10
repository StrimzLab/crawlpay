import { randomBytes } from 'node:crypto';
import type { Redis } from 'ioredis';
import type { Address } from 'viem';

const PREFIX = 'crawlpay:auth:session:';
const TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  address: Address;
  /** Unix seconds when this session was created. */
  createdAt: number;
}

/**
 * Maps an opaque session ID (set as an HTTP-only cookie) to the wallet
 * address that signed in. The cookie carries the SID, not the address —
 * the address is server-side only, lookuped per request.
 */
export interface SessionStore {
  create(address: Address): Promise<string>;
  read(sid: string): Promise<SessionPayload | null>;
  destroy(sid: string): Promise<void>;
}

export class RedisSessionStore implements SessionStore {
  constructor(private readonly redis: Redis) {}

  async create(address: Address): Promise<string> {
    const sid = randomBytes(24).toString('hex');
    const payload: SessionPayload = {
      address: address.toLowerCase() as Address,
      createdAt: Math.floor(Date.now() / 1000),
    };
    await this.redis.set(`${PREFIX}${sid}`, JSON.stringify(payload), 'EX', TTL_SECONDS);
    return sid;
  }

  async read(sid: string): Promise<SessionPayload | null> {
    const raw = await this.redis.get(`${PREFIX}${sid}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SessionPayload;
    } catch {
      return null;
    }
  }

  async destroy(sid: string): Promise<void> {
    await this.redis.del(`${PREFIX}${sid}`);
  }
}

export class MemorySessionStore implements SessionStore {
  readonly #entries = new Map<string, { payload: SessionPayload; exp: number }>();

  async create(address: Address): Promise<string> {
    this.#sweep();
    const sid = randomBytes(24).toString('hex');
    this.#entries.set(sid, {
      payload: {
        address: address.toLowerCase() as Address,
        createdAt: Math.floor(Date.now() / 1000),
      },
      exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
    });
    return sid;
  }

  async read(sid: string): Promise<SessionPayload | null> {
    this.#sweep();
    const entry = this.#entries.get(sid);
    return entry?.payload ?? null;
  }

  async destroy(sid: string): Promise<void> {
    this.#entries.delete(sid);
  }

  #sweep(): void {
    const now = Math.floor(Date.now() / 1000);
    for (const [sid, e] of this.#entries) {
      if (e.exp < now) this.#entries.delete(sid);
    }
  }
}
