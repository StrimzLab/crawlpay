import { recoverAddress, type Address } from 'viem';
import type { CrawlPayReceipt } from '@crawlpay/types';
import { hashReceiptBody } from './sign';

export interface VerificationResult {
  valid: boolean;
  /** Address recovered from the signature. */
  recoveredAddress: Address;
  /** Address embedded in the receipt as `facilitatorPubkey`. */
  claimedAddress: Address;
  /** Set when `valid=false`. */
  reason?: string;
}

/**
 * Verify a CrawlPayReceipt's signature.
 *
 *   1. Recompute the canonical hash of the receipt body.
 *   2. Recover the signer address from `(hash, signature)`.
 *   3. Check it matches the embedded `facilitatorPubkey`.
 *   4. If `expectedSigner` was provided, also check it matches.
 *
 * Returns a structured result (never throws on bad signature) so callers
 * can attach the reason to error responses or audit logs.
 */
export async function verifyReceipt(
  receipt: CrawlPayReceipt,
  expectedSigner?: Address,
): Promise<VerificationResult> {
  const { signature, ...body } = receipt;
  const hash = hashReceiptBody(body);
  const recoveredAddress = await recoverAddress({ hash, signature });

  if (recoveredAddress.toLowerCase() !== body.facilitatorPubkey.toLowerCase()) {
    return {
      valid: false,
      recoveredAddress,
      claimedAddress: body.facilitatorPubkey,
      reason: 'recovered signer does not match embedded facilitatorPubkey',
    };
  }

  if (expectedSigner && recoveredAddress.toLowerCase() !== expectedSigner.toLowerCase()) {
    return {
      valid: false,
      recoveredAddress,
      claimedAddress: body.facilitatorPubkey,
      reason: `signature is not from expected signer ${expectedSigner}`,
    };
  }

  return {
    valid: true,
    recoveredAddress,
    claimedAddress: body.facilitatorPubkey,
  };
}
