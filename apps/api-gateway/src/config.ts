import type { Network } from '@crawlpay/types';

export interface ApiGatewayConfig {
  port: number;
  logLevel: string;
  network: Network;
  databaseUrl?: string;
  redisUrl?: string;
  facilitatorUrl?: string;
  /** Arc HTTP RPC for on-chain reads (ERC-8004 reputation, etc.). */
  arcRpcUrl: string;
  siwe: {
    /** Domain that must match the SIWE message's `domain` field. */
    domain: string;
    /** Allowed EVM chain IDs for SIWE messages. Defaults to Arc Testnet. */
    allowedChainIds: number[];
  };
}

const SUPPORTED_NETWORKS: readonly Network[] = ['arcTestnet'];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiGatewayConfig {
  const port = Number(env.API_PORT ?? 8080);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`API_PORT must be an integer in [1, 65535]; got ${env.API_PORT}`);
  }

  const network = (env.CRAWLPAY_NETWORK ?? 'arcTestnet') as Network;
  if (!SUPPORTED_NETWORKS.includes(network)) {
    throw new Error(
      `CRAWLPAY_NETWORK "${network}" not supported. Supported: ${SUPPORTED_NETWORKS.join(', ')}`,
    );
  }

  const allowedChainIds = (env.SIWE_ALLOWED_CHAIN_IDS ?? '5042002')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (allowedChainIds.length === 0) {
    throw new Error('SIWE_ALLOWED_CHAIN_IDS must contain at least one valid chain ID');
  }

  return {
    port,
    logLevel: env.LOG_LEVEL ?? 'info',
    network,
    databaseUrl: env.DATABASE_URL || undefined,
    redisUrl: env.REDIS_URL || undefined,
    facilitatorUrl: env.NEXT_PUBLIC_FACILITATOR_URL || undefined,
    arcRpcUrl: env.ARC_RPC_URL ?? 'https://rpc.testnet.arc.network',
    siwe: {
      domain: env.SIWE_DOMAIN ?? 'localhost:3000',
      allowedChainIds,
    },
  };
}
