/**
 * Smoke-test seller — minimal Express server that paywalls one route via
 * Circle Gateway's x402-batching middleware.
 *
 * Run:    pnpm smoke:seller     (workspace root)
 * Pair:   pnpm smoke:buyer      (other terminal, after this is listening)
 *
 * Purpose: prove the seller half of the protocol against real Circle Gateway
 * on Arc Testnet, before we wrap it inside @crawlpay/proxy-middleware.
 */
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  createGatewayMiddleware,
  type PaymentRequest,
} from '@circle-fin/x402-batching/server';

const PORT = Number(process.env.DEMO_PUBLISHER_PORT ?? 4000);
const PUBLISHER_ADDRESS = process.env.PUBLISHER_ADDRESS;
const GATEWAY_API_URL =
  process.env.CIRCLE_GATEWAY_API_URL ?? 'https://gateway-api-testnet.circle.com';
const ARC_TESTNET_CAIP2 = 'eip155:5042002';

if (!PUBLISHER_ADDRESS) {
  throw new Error(
    'PUBLISHER_ADDRESS is not set in .env — fill it with the address from `cast wallet new`.',
  );
}

const app = express();

// Request log — useful while iterating on the smoke test. Removed in proxy-middleware
// where logging will be configurable.
app.use((req, res, next) => {
  const hasPayment = req.headers['payment-signature'] ? 'with Payment-Signature' : 'no payment';
  console.log(`[smoke seller] → ${req.method} ${req.url}  (${hasPayment})`);
  res.on('finish', () => {
    console.log(`[smoke seller] ← ${res.statusCode} ${req.method} ${req.url}`);
  });
  next();
});

const gateway = createGatewayMiddleware({
  sellerAddress: PUBLISHER_ADDRESS as `0x${string}`,
  facilitatorUrl: GATEWAY_API_URL,
  networks: [ARC_TESTNET_CAIP2],
});

app.get('/premium-data', gateway.require('$0.0001'), (req: Request, res: Response) => {
  // `createGatewayMiddleware` attaches `payment` to the request object. The SDK
  // ships a `PaymentRequest` type for this; cast through `unknown` because
  // PaymentRequest extends Node's IncomingMessage rather than Express's Request.
  const payment = (req as unknown as PaymentRequest).payment;
  console.log(
    `[smoke seller] ✓ paid fetch from ${payment?.payer}` +
      ` (${payment?.amount} on ${payment?.network})`,
  );
  res.json({
    article: 'How Circle Built Arc',
    body: 'Sample paid content. In production this would be the actual article body.',
    paidBy: payment?.payer,
    settlement: payment?.transaction,
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    sellerAddress: PUBLISHER_ADDRESS,
    network: 'arcTestnet',
    gatewayApiUrl: GATEWAY_API_URL,
  });
});

// Surface any middleware throw with cause chain — otherwise Express's default
// handler swallows the detail.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[smoke seller] ✗ middleware error:');
  if (err instanceof Error) {
    console.error(`               ${err.name}: ${err.message}`);
    if ('cause' in err && err.cause) {
      console.error(`               ↳ caused by: ${String(err.cause)}`);
    }
    if (err.stack) console.error(err.stack);
  } else {
    console.error(`               ${String(err)}`);
  }
  if (!res.headersSent) {
    res.status(500).json({ error: 'internal_error', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log('─'.repeat(64));
  console.log(`[smoke seller] listening at http://localhost:${PORT}`);
  console.log(`[smoke seller] seller address:   ${PUBLISHER_ADDRESS}`);
  console.log(`[smoke seller] gateway API URL:  ${GATEWAY_API_URL}`);
  console.log(`[smoke seller] networks:         [${ARC_TESTNET_CAIP2}]`);
  console.log(`[smoke seller] paywalled route:  GET /premium-data  ($0.0001)`);
  console.log(`[smoke seller] health route:     GET /health`);
  console.log('─'.repeat(64));
  console.log('[smoke seller] In another terminal: pnpm smoke:buyer');
});
