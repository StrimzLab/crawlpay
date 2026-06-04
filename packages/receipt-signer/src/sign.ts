import { keccak256, toHex, type Address, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { CrawlPayReceipt, CrawlPayReceiptBody } from '@crawlpay/types';
import { canonicalizeReceipt } from './canonicalize';

/**
 * Signing surface — pluggable so production deployments can swap in
 * KMS/HSM-backed signers without changing the rest of the stack.
 */
export interface ReceiptSigner {
  /** Public address corresponding to the signing key. */
  readonly address: Address;
  /** Sign a 32-byte message hash, return a 65-byte hex signature. */
  sign(messageHash: Hex): Promise<Hex>;
}

/**
 * In-process signer backed by a viem account. Suitable for v0 hosted
 * facilitator and for tests. Do not use directly in production — wrap a
 * KMS/HSM-backed signer in the same `ReceiptSigner` interface instead.
 */
export class PrivateKeyReceiptSigner implements ReceiptSigner {
  readonly address: Address;
  readonly #account: ReturnType<typeof privateKeyToAccount>;

  constructor(privateKey: Hex) {
    this.#account = privateKeyToAccount(privateKey);
    this.address = this.#account.address;
  }

  async sign(messageHash: Hex): Promise<Hex> {
    return this.#account.sign({ hash: messageHash });
  }
}

/** keccak256 over the canonical JSON of the receipt body. */
export function hashReceiptBody(receipt: CrawlPayReceiptBody): Hex {
  return keccak256(toHex(canonicalizeReceipt(receipt)));
}

/**
 * Sign a receipt body. The signer's address is embedded as `facilitatorPubkey`
 * so verifiers can confirm signer identity from the receipt alone.
 */
export async function signReceipt(
  body: Omit<CrawlPayReceiptBody, 'facilitatorPubkey'>,
  signer: ReceiptSigner,
): Promise<CrawlPayReceipt> {
  const withPubkey: CrawlPayReceiptBody = {
    ...body,
    facilitatorPubkey: signer.address,
  };
  const hash = hashReceiptBody(withPubkey);
  const signature = await signer.sign(hash);
  return { ...withPubkey, signature };
}
