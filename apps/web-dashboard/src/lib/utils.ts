import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind utility classes, deduping conflicts. Standard shadcn util. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Truncate an Ethereum-style address: 0x9D8e…f381 */
export function formatAddress(addr: string, head = 4, tail = 4): string {
  if (!addr) return '';
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, 2 + head)}…${addr.slice(-tail)}`;
}

/** Format atomic USDC (string or bigint) into a `$X.XXXX` display string. */
export function formatUsdc(atomic: string | bigint | number, decimals = 4): string {
  const value = typeof atomic === 'bigint' ? atomic : BigInt(atomic);
  const whole = value / 1_000_000n;
  const fraction = value % 1_000_000n;
  if (fraction === 0n) {
    return `${whole.toString()}.${'0'.repeat(decimals)}`;
  }
  const padded = fraction.toString().padStart(6, '0');
  const trimmed = decimals < 6 ? padded.slice(0, decimals) : padded;
  return `${whole.toString()}.${trimmed}`;
}
