import type { Network } from '@crawlpay/types';

export interface ApiGatewayConfig {
  port: number;
  logLevel: string;
  network: Network;
  databaseUrl?: string;
  facilitatorUrl?: string;
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

  return {
    port,
    logLevel: env.LOG_LEVEL ?? 'info',
    network,
    databaseUrl: env.DATABASE_URL || undefined,
    facilitatorUrl: env.NEXT_PUBLIC_FACILITATOR_URL || undefined,
  };
}
