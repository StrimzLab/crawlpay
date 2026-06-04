/**
 * Probe Circle Gateway's `getSupported()` to see what network kinds are
 * actually advertised. Useful when chasing "No payment networks available"
 * or verifying that a given chain is listed.
 *
 * Run:  pnpm smoke:probe
 */
import { BatchFacilitatorClient } from '@circle-fin/x402-batching/server';

const GATEWAY_API_URL =
  process.env.CIRCLE_GATEWAY_API_URL ?? 'https://gateway-api-testnet.circle.com';
const ARC_TESTNET_CAIP2 = 'eip155:5042002';

async function main() {
  console.log('─'.repeat(64));
  console.log(`[probe] querying ${GATEWAY_API_URL} GET /v1/x402/supported`);

  const facilitator = new BatchFacilitatorClient({ url: GATEWAY_API_URL });
  const supported = await facilitator.getSupported();

  console.log(`[probe] kinds: ${supported.kinds.length}`);
  for (const k of supported.kinds) {
    const extra = k.extra ? `  extra=${JSON.stringify(k.extra)}` : '';
    console.log(
      `        ${k.network.padEnd(20)}  scheme=${k.scheme}  x402=${k.x402Version}${extra}`,
    );
  }

  const arc = supported.kinds.find((k) => k.network === ARC_TESTNET_CAIP2);
  console.log('─'.repeat(64));
  if (arc) {
    console.log(`[probe] ✓ Arc Testnet (${ARC_TESTNET_CAIP2}) IS advertised`);
    if (arc.extra) console.log(`        verifyingContract: ${(arc.extra as { verifyingContract?: string }).verifyingContract}`);
  } else {
    console.log(`[probe] ✗ Arc Testnet (${ARC_TESTNET_CAIP2}) NOT in advertised list`);
    console.log('        Possible causes:');
    console.log('        - You hit the mainnet URL — set CIRCLE_GATEWAY_API_URL to the testnet endpoint');
    console.log('        - Arc Testnet temporarily out of rotation (Circle-side)');
  }
  console.log('─'.repeat(64));
}

main().catch((err) => {
  console.error('[probe] FAILED');
  if (err instanceof Error) {
    console.error(`${err.name}: ${err.message}`);
    if ('cause' in err && err.cause) console.error(`↳ caused by: ${String(err.cause)}`);
    if (err.stack) console.error(err.stack);
  } else {
    console.error(err);
  }
  process.exit(1);
});
