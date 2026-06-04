import type { Address, Hex } from './primitives';

/**
 * EIP-3009 TransferWithAuthorization message.
 *
 * For Circle Gateway batched payments this is signed against the
 * `GatewayWalletBatched` EIP-712 domain, NOT the standard USDC domain —
 * a common pitfall in the original PRD assumptions.
 */
export interface Eip3009Authorization {
  from: Address;
  to: Address;
  /** Atomic USDC, stringified for EIP-712 uint256 encoding. */
  value: string;
  /** Unix seconds. 0 means valid immediately. */
  validAfter: string;
  /**
   * Unix seconds. Circle Gateway requires this to be at least 3 days in the
   * future (`authorization_validity_too_short` is thrown otherwise).
   */
  validBefore: string;
  /** 32-byte hex, must be unique per authorization. */
  nonce: Hex;
}

/**
 * EIP-712 domain for Circle Gateway batched payments.
 *
 *   name             = 'GatewayWalletBatched'   (NOT 'USD Coin')
 *   version          = '1'                       (NOT '2')
 *   chainId          = standard EVM chain ID (not the Gateway domain ID)
 *   verifyingContract = the GatewayWallet contract (NOT the USDC contract)
 */
export interface GatewayBatchedDomain {
  name: 'GatewayWalletBatched';
  version: '1';
  chainId: number;
  verifyingContract: Address;
}

export const GATEWAY_BATCHED_DOMAIN_NAME = 'GatewayWalletBatched' as const;
export const GATEWAY_BATCHED_DOMAIN_VERSION = '1' as const;

/** EIP-712 type definition for TransferWithAuthorization. */
export const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

/** Minimum validity window required by Gateway: 3 days in seconds. */
export const GATEWAY_MIN_VALIDITY_SECONDS = 3 * 24 * 60 * 60;

/** Default validity window we use when constructing authorizations: 5 days. */
export const DEFAULT_VALIDITY_SECONDS = 5 * 24 * 60 * 60;
