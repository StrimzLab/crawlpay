import type { Hex, Network } from '@crawlpay/types';

export interface FacilitatorConfig {
  port: number;
  logLevel: string;
  network: Network;
  gatewayApiUrl: string;
  receiptSigningKey: Hex;
  /** When set, the facilitator uses PostgresReceiptRepository instead of memory. */
  databaseUrl?: string;
  /** When set, the facilitator uses RedisNonceTracker instead of memory. */
  redisUrl?: string;
}

const SUPPORTED_NETWORKS: readonly Network[] = ['arcTestnet'];

/**
 * Parse and validate environment variables. Throws on any malformed value
 * so the service fails fast on startup rather than at first request.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): FacilitatorConfig {
  const port = Number(env.FACILITATOR_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`FACILITATOR_PORT must be an integer in [1, 65535]; got ${env.FACILITATOR_PORT}`);
  }

  const network = (env.CRAWLPAY_NETWORK ?? 'arcTestnet') as Network;
  if (!SUPPORTED_NETWORKS.includes(network)) {
    throw new Error(
      `CRAWLPAY_NETWORK "${network}" not supported. Supported: ${SUPPORTED_NETWORKS.join(', ')}`,
    );
  }

  const gatewayApiUrl = env.CIRCLE_GATEWAY_API_URL ?? 'https://gateway-api-testnet.circle.com';

  const receiptSigningKey = env.CRAWLPAY_RECEIPT_PRIVATE_KEY;
  if (!receiptSigningKey) {
    throw new Error('CRAWLPAY_RECEIPT_PRIVATE_KEY is required');
  }
  if (!/^0x[0-9a-fA-F]{64}$/.test(receiptSigningKey)) {
    throw new Error('CRAWLPAY_RECEIPT_PRIVATE_KEY must be a 0x-prefixed 32-byte hex string');
  }

  return {
    port,
    logLevel: env.LOG_LEVEL ?? 'info',
    network,
    gatewayApiUrl,
    receiptSigningKey: receiptSigningKey as Hex,
    databaseUrl: env.DATABASE_URL || undefined,
    redisUrl: env.REDIS_URL || undefined,
  };
}
