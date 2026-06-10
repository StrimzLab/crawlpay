/**
 * Client for the api-gateway's /reputation/* endpoints.
 *
 * The api-gateway reads ERC-8004 IdentityRegistry + ReputationRegistry on
 * Arc Testnet, caches results for 5 minutes, and serves a compact JSON
 * summary that's safe to render in a chip.
 */

const BASE = '/api';

export interface AgentRecord {
  /** ERC-721 tokenId from the IdentityRegistry, stringified for JSON safety. */
  agentId: string;
  /** Address that currently owns the agent NFT. */
  owner: string;
  /** Off-chain metadata pointer (ipfs://, https://, …). */
  metadataURI: string;
}

export interface ReputationSummary {
  /** Null when the wallet has no ERC-8004 agent registered. */
  agent: AgentRecord | null;
  /** Best-effort count of feedback events for this agent. */
  feedbackCount: number;
  /** Average score, when computable (currently null — needs the verified ABI). */
  avgScore: number | null;
}

export async function getReputation(address: string): Promise<ReputationSummary> {
  const res = await fetch(`${BASE}/reputation/${address}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`/reputation/${address} ${res.status}`);
  const data = (await res.json()) as { reputation: ReputationSummary };
  return data.reputation;
}
