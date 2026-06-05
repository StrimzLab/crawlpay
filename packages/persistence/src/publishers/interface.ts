import type { Address, AtomicUsdc, Network } from '@crawlpay/types';

export interface PublisherRecord {
  id: string;
  domain: string;
  walletAddress: Address;
  network: Network;
  defaultPriceAtomic: AtomicUsdc;
  erc8004AgentId?: string;
  description?: string;
  minReputationScore: number;
  robotsTxtAware: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePublisherInput {
  id: string;
  domain: string;
  walletAddress: Address;
  network: Network;
  defaultPriceAtomic?: AtomicUsdc;
  erc8004AgentId?: string;
  description?: string;
  minReputationScore?: number;
  robotsTxtAware?: boolean;
  active?: boolean;
}

export interface PublisherFilter {
  active?: boolean;
  network?: Network;
  limit?: number;
  offset?: number;
}

export interface PublisherRepository {
  create(input: CreatePublisherInput): Promise<PublisherRecord>;
  get(id: string): Promise<PublisherRecord | null>;
  getByDomain(domain: string): Promise<PublisherRecord | null>;
  list(filter?: PublisherFilter): Promise<PublisherRecord[]>;
  count(filter?: PublisherFilter): Promise<number>;
}

/** Thrown by `create()` on UNIQUE constraint violation (id or domain collision). */
export class PublisherAlreadyExistsError extends Error {
  constructor(
    public readonly field: 'id' | 'domain',
    public readonly value: string,
  ) {
    super(`Publisher with ${field}="${value}" already exists`);
    this.name = 'PublisherAlreadyExistsError';
  }
}
