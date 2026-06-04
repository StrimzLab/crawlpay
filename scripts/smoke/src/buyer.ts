/**
 * Smoke-test buyer — deposits USDC into Circle Gateway (one-time, onchain on
 * Arc Testnet), then pays for the resource exposed by src/seller.ts.
 *
 * Run:  pnpm smoke:buyer   (from the workspace root, after `pnpm smoke:seller`)
 *
 * This is the foundation we de-risk before building anything else. If this
 * round-trips cleanly we know:
 *   - The EOA crawler wallet is funded and signs
 *   - Circle Gateway accepts the EIP-3009 authorization
 *   - Arc Testnet settles the batch
 *   - The seller's middleware verifies and serves content
 */
import { GatewayClient } from '@circle-fin/x402-batching/client';

const CRAWLER_PRIVATE_KEY = process.env.CRAWLER_PRIVATE_KEY;
const PUBLISHER_PORT = process.env.DEMO_PUBLISHER_PORT ?? '4000';
const SELLER_URL = `http://localhost:${PUBLISHER_PORT}/premium-data`;

if (!CRAWLER_PRIVATE_KEY) {
  throw new Error(
    'CRAWLER_PRIVATE_KEY is not set in .env — generate with `cast wallet new`, fund the address at faucet.circle.com (Arc Testnet), then fill .env.',
  );
}
if (!CRAWLER_PRIVATE_KEY.startsWith('0x')) {
  throw new Error('CRAWLER_PRIVATE_KEY must be a 0x-prefixed hex string.');
}

const MIN_GATEWAY_BALANCE_ATOMIC = 1_000_000n;

const client = new GatewayClient({
  chain: 'arcTestnet',
  privateKey: CRAWLER_PRIVATE_KEY as `0x${string}`,
});

async function main() {
  console.log('─'.repeat(64));
  console.log(`[smoke buyer] crawler address: ${client.address}`);

  console.log('[smoke buyer] checking balances ...');
  const before = await client.getBalances();
  console.log(`               wallet:  ${before.wallet.formatted} USDC`);
  console.log(`               gateway: ${before.gateway.formattedAvailable} USDC available`);

  if (before.gateway.available < MIN_GATEWAY_BALANCE_ATOMIC) {
    console.log('[smoke buyer] depositing 1 USDC into Gateway (one-time on-chain tx) ...');
    const deposit = await client.deposit('1');
    console.log(
      `               ✓ deposit tx: https://testnet.arcscan.app/tx/${deposit.depositTxHash}`,
    );
  } else {
    console.log('[smoke buyer] gateway balance sufficient, skipping deposit');
  }

  console.log(`[smoke buyer] paying for ${SELLER_URL} ...`);
  const start = Date.now();
  const result = await client.pay<{ article: string; settlement: string }>(SELLER_URL);
  const elapsedMs = Date.now() - start;
  console.log(
    `               ✓ HTTP ${result.status} — paid ${result.formattedAmount} USDC in ${elapsedMs}ms`,
  );
  console.log(
    `               ✓ settlement: https://testnet.arcscan.app/tx/${result.transaction}`,
  );
  console.log(
    `               ✓ response preview: ${JSON.stringify(result.data).slice(0, 140)}`,
  );

  console.log('[smoke buyer] balances after:');
  const after = await client.getBalances();
  console.log(`               wallet:  ${after.wallet.formatted} USDC`);
  console.log(`               gateway: ${after.gateway.formattedAvailable} USDC available`);

  console.log('─'.repeat(64));
  console.log('[smoke buyer] ✓ SMOKE TEST PASSED — Circle Gateway + Arc round-trip works');
}

function printError(err: unknown, indent = 0) {
  const pad = ' '.repeat(indent);
  if (err instanceof Error) {
    console.error(`${pad}${err.name}: ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1).map((l) => pad + l).join('\n'));
    if ('cause' in err && err.cause) {
      console.error(`${pad}↳ caused by:`);
      printError(err.cause, indent + 4);
    }
  } else {
    console.error(`${pad}${String(err)}`);
  }
}

main().catch((err) => {
  console.error('─'.repeat(64));
  console.error('[smoke buyer] ✗ SMOKE TEST FAILED');
  printError(err);
  process.exit(1);
});
