import {
  createPublicClient,
  http,
  parseAbiItem,
  type Address,
  type PublicClient,
} from 'viem';
import { arcTestnet } from 'viem/chains';

/**
 * ERC-8004 contract addresses on Arc Testnet.
 * Source: docs.arc.io/arc/tutorials/register-your-first-ai-agent
 */
const IDENTITY_REGISTRY: Address = '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const REPUTATION_REGISTRY: Address = '0x8004B663056A597Dffe9eCcC1965A193B7388713';

/**
 * ERC-721 Transfer event — emitted by IdentityRegistry on register().
 * We use the latest `to == wallet` Transfer to derive a wallet's agentId.
 */
const TRANSFER_EVENT = parseAbiItem(
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
);

/**
 * Best-effort guess at the ReputationRegistry feedback event shape. The
 * giveFeedback() function signature is documented; the event signature isn't.
 * If this guess is wrong the getLogs call simply returns nothing and we
 * report feedbackCount = 0 — never throws to the caller.
 */
const FEEDBACK_EVENT = parseAbiItem(
  'event FeedbackGiven(uint256 indexed agentId, address indexed from, int128 score, uint8 feedbackType, string tag, bytes32 feedbackHash)',
);

const IDENTITY_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

/** Arc Testnet RPCs cap eth_getLogs ranges around 10k blocks. */
const LOG_RANGE_BLOCKS = 10_000n;

/** How long we trust a cached reputation lookup before refreshing. */
const CACHE_TTL_MS = 5 * 60 * 1000;

export interface AgentRecord {
  /** ERC-721 tokenId from the IdentityRegistry, stringified for JSON safety. */
  agentId: string;
  owner: Address;
  /** Off-chain metadata pointer set by the agent owner (ipfs://, https://, …). */
  metadataURI: string;
}

export interface ReputationSummary {
  /** Null when the wallet has no ERC-8004 agent registered on Arc. */
  agent: AgentRecord | null;
  /**
   * Approximate count of feedback events for this agent. Depends on the
   * speculative FeedbackGiven ABI; reports 0 if the event signature differs.
   */
  feedbackCount: number;
  /** Average score if computable (currently null — needs verified ABI). */
  avgScore: number | null;
}

export interface ReputationService {
  getReputation(wallet: Address): Promise<ReputationSummary>;
}

interface CachedSummary {
  summary: ReputationSummary;
  expiresAt: number;
}

export class OnChainReputationService implements ReputationService {
  readonly #client: PublicClient;
  readonly #cache = new Map<string, CachedSummary>();

  constructor(rpcUrl: string) {
    this.#client = createPublicClient({
      chain: arcTestnet,
      transport: http(rpcUrl),
    });
  }

  async getReputation(wallet: Address): Promise<ReputationSummary> {
    const key = wallet.toLowerCase();
    const cached = this.#cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.summary;
    }

    let summary: ReputationSummary;
    try {
      summary = await this.#fetchFresh(wallet);
    } catch (err) {
      // Reputation is non-essential — never block the dashboard if the RPC
      // is flaky. Return an empty summary and try again later.
      summary = { agent: null, feedbackCount: 0, avgScore: null };
      // eslint-disable-next-line no-console
      console.warn('[reputation] fetch failed', err instanceof Error ? err.message : err);
    }

    this.#cache.set(key, { summary, expiresAt: Date.now() + CACHE_TTL_MS });
    return summary;
  }

  async #fetchFresh(wallet: Address): Promise<ReputationSummary> {
    const agent = await this.#lookupAgent(wallet);
    if (!agent) {
      return { agent: null, feedbackCount: 0, avgScore: null };
    }
    const feedbackCount = await this.#countFeedback(BigInt(agent.agentId));
    return { agent, feedbackCount, avgScore: null };
  }

  async #lookupAgent(wallet: Address): Promise<AgentRecord | null> {
    const latest = await this.#client.getBlockNumber();
    const fromBlock = latest > LOG_RANGE_BLOCKS ? latest - LOG_RANGE_BLOCKS : 0n;

    const logs = await this.#client.getLogs({
      address: IDENTITY_REGISTRY,
      event: TRANSFER_EVENT,
      args: { to: wallet },
      fromBlock,
      toBlock: latest,
    });

    if (logs.length === 0) return null;

    // Most recent Transfer wins — the wallet might have received multiple
    // tokens; we take the latest as its "primary" agent.
    const latestLog = logs[logs.length - 1];
    const tokenId = latestLog?.args.tokenId;
    if (tokenId === undefined) return null;

    // Confirm current ownership — they might have transferred the NFT away.
    const currentOwner = await this.#client.readContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: 'ownerOf',
      args: [tokenId],
    });
    if (currentOwner.toLowerCase() !== wallet.toLowerCase()) {
      return null;
    }

    const tokenURI = await this.#client.readContract({
      address: IDENTITY_REGISTRY,
      abi: IDENTITY_ABI,
      functionName: 'tokenURI',
      args: [tokenId],
    });

    return {
      agentId: tokenId.toString(),
      owner: currentOwner as Address,
      metadataURI: tokenURI,
    };
  }

  async #countFeedback(agentId: bigint): Promise<number> {
    const latest = await this.#client.getBlockNumber();
    const fromBlock = latest > LOG_RANGE_BLOCKS ? latest - LOG_RANGE_BLOCKS : 0n;

    try {
      const logs = await this.#client.getLogs({
        address: REPUTATION_REGISTRY,
        event: FEEDBACK_EVENT,
        args: { agentId },
        fromBlock,
        toBlock: latest,
      });
      return logs.length;
    } catch {
      // ABI guess wrong or event filter unsupported — silently report 0.
      return 0;
    }
  }
}

/** Dev/test fallback that always reports "no agent registered". */
export class StubReputationService implements ReputationService {
  async getReputation(): Promise<ReputationSummary> {
    return { agent: null, feedbackCount: 0, avgScore: null };
  }
}
