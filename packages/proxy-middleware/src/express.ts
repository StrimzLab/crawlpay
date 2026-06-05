import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Address } from 'viem';
import {
  GATEWAY_BATCHED_DOMAIN_NAME,
  GATEWAY_BATCHED_DOMAIN_VERSION,
  type Network,
  NETWORK_TO_CAIP2,
  type PaymentPayload,
  type PaymentRequiredResponse,
  type PaymentRequirement,
  X402_HEADERS,
} from '@crawlpay/types';
import { DefaultBotClassifier } from './classifier';
import { CircleGatewayFacilitator, type FacilitatorAdapter } from './facilitator';
import { GlobPricingResolver, type PricingResolver } from './pricing';
import { encodeReceiptHeader, issueReceipt } from './receipts';
import type { CrawlPayMiddlewareConfig, ErrorEvent } from './types';

/** USDC contract addresses per supported network. */
const NETWORK_TO_USDC_ADDRESS: Record<Network, Address> = {
  arcTestnet: '0x3600000000000000000000000000000000000000',
};

/**
 * Validity window we publish in 402 offers (in seconds).
 * Gateway's testnet `getSupported()` advertises a 7-day floor, so we go
 * one day above it to leave the SDK comfortable headroom.
 */
const OFFER_VALIDITY_WINDOW_SECONDS = 8 * 24 * 60 * 60;

const PAYMENT_SIGNATURE_HEADER = X402_HEADERS.signature.toLowerCase();

/**
 * CrawlPay's publisher middleware.
 *
 * Composition (left → right):
 *
 *   classifier  →  pricing  →  facilitator settle  →  receipt signer  →  next()
 *
 * Each step is pluggable via `CrawlPayMiddlewareConfig`. The default wiring
 * uses heuristic bot classification, glob-based pricing, Circle Gateway as
 * the facilitator, and the publisher's local ReceiptSigner.
 */
export function crawlpay(config: CrawlPayMiddlewareConfig): RequestHandler {
  const classifier = config.botClassifier ?? new DefaultBotClassifier();
  const pricingResolver: PricingResolver =
    config.pricingResolver ??
    new GlobPricingResolver(config.pricingRules ?? [], config.defaultPrice);
  const facilitator: FacilitatorAdapter =
    config.facilitator ?? new CircleGatewayFacilitator(config.network);

  const caip2 = NETWORK_TO_CAIP2[config.network];
  const usdcAddress = NETWORK_TO_USDC_ADDRESS[config.network];
  if (!usdcAddress) {
    throw new Error(`No USDC address configured for network "${config.network}"`);
  }

  const middleware: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    const fullUrl = `${req.protocol}://${req.get('host') ?? 'localhost'}${req.originalUrl}`;
    const startedAt = Date.now();

    // 1. Classify
    let classification;
    try {
      classification = classifier.classify({
        method: req.method,
        url: req.originalUrl,
        headers: req.headers,
        ip: req.ip,
      });
    } catch (err) {
      await emitError(config, fullUrl, err, 'classify');
      return next(err);
    }

    if (!classification.isCrawler) {
      await config.onSkip?.({ url: fullUrl, reason: 'human', classification });
      return next();
    }

    // 2. Price
    const pricing = pricingResolver.resolve(req.originalUrl, req.method);
    if (!pricing || pricing.priceAtomic === 0n) {
      await config.onSkip?.({ url: fullUrl, reason: 'free-path', classification });
      return next();
    }

    const paymentHeaderRaw = req.headers[PAYMENT_SIGNATURE_HEADER];
    const paymentHeader = Array.isArray(paymentHeaderRaw) ? paymentHeaderRaw[0] : paymentHeaderRaw;

    // 3. No payment yet — emit 402 with offer
    if (!paymentHeader) {
      try {
        const verifyingContract = await facilitator.getVerifyingContract(caip2);
        if (!verifyingContract) {
          res.status(503).json({ x402Version: 2, error: 'no_verifying_contract' });
          return;
        }
        const offer: PaymentRequiredResponse = {
          x402Version: 2,
          accepts: [
            {
              scheme: 'exact',
              network: caip2,
              amount: pricing.priceAtomic.toString(),
              payTo: config.publisherWallet,
              asset: usdcAddress,
              maxTimeoutSeconds: OFFER_VALIDITY_WINDOW_SECONDS,
              resource: fullUrl,
              description: config.description,
              extra: {
                name: GATEWAY_BATCHED_DOMAIN_NAME,
                version: GATEWAY_BATCHED_DOMAIN_VERSION,
                verifyingContract,
                crawlpay_publisher_id: config.publisherId,
                ...(config.erc8004AgentId
                  ? { crawlpay_erc8004_agent_id: config.erc8004AgentId }
                  : {}),
              },
            },
          ],
        };
        res.status(402).json(offer);
        return;
      } catch (err) {
        await emitError(config, fullUrl, err, 'verify');
        return next(err);
      }
    }

    // 4. Decode payload + settle via facilitator
    let payload: PaymentPayload;
    try {
      payload = decodePaymentPayload(paymentHeader);
    } catch {
      res.status(402).json({ x402Version: 2, error: 'invalid_payload' });
      return;
    }

    const verifyingContract = await facilitator.getVerifyingContract(caip2);
    if (!verifyingContract) {
      res.status(503).json({ x402Version: 2, error: 'no_verifying_contract' });
      return;
    }

    const requirements: PaymentRequirement = {
      scheme: 'exact',
      network: caip2,
      amount: pricing.priceAtomic.toString(),
      payTo: config.publisherWallet,
      asset: usdcAddress,
      maxTimeoutSeconds: OFFER_VALIDITY_WINDOW_SECONDS,
      extra: {
        name: GATEWAY_BATCHED_DOMAIN_NAME,
        version: GATEWAY_BATCHED_DOMAIN_VERSION,
        verifyingContract,
      },
    };

    let settlement;
    try {
      settlement = await facilitator.settle(payload, requirements);
    } catch (err) {
      await emitError(config, fullUrl, err, 'settle');
      return next(err);
    }

    if (!settlement.success || !settlement.payer) {
      res.status(402).json({
        x402Version: 2,
        error: settlement.errorReason ?? 'settlement_failed',
      });
      return;
    }

    // 5. Sign CrawlPayReceipt
    let receipt;
    try {
      receipt = await issueReceipt(
        {
          publisherId: config.publisherId,
          publisherWallet: config.publisherWallet,
          crawlerWallet: settlement.payer,
          url: fullUrl,
          amount: pricing.priceAtomic,
          network: config.network,
          authorizationNonce: payload.payload.authorization.nonce,
        },
        config.receiptSigner,
      );
    } catch (err) {
      await emitError(config, fullUrl, err, 'sign-receipt');
      return next(err);
    }

    // Make the receipt available to downstream handlers and clients.
    res.setHeader(X402_HEADERS.response, encodeReceiptHeader(receipt));
    res.locals.crawlpayReceipt = receipt;

    await config.onPayment?.({
      url: fullUrl,
      crawlerWallet: settlement.payer,
      amount: pricing.priceAtomic,
      receipt,
      settlementId: settlement.transaction ?? '',
      durationMs: Date.now() - startedAt,
    });

    return next();
  };

  return middleware;
}

function decodePaymentPayload(headerValue: string): PaymentPayload {
  const json = Buffer.from(headerValue, 'base64').toString('utf-8');
  return JSON.parse(json) as PaymentPayload;
}

async function emitError(
  config: CrawlPayMiddlewareConfig,
  url: string,
  err: unknown,
  phase: ErrorEvent['phase'],
): Promise<void> {
  const error = err instanceof Error ? err : new Error(String(err));
  try {
    await config.onError?.({ url, error, phase });
  } catch {
    // Don't compound errors thrown by the user's handler.
  }
}
