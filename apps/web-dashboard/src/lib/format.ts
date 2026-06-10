/**
 * Display formatters for atomic USDC values, addresses, and timestamps.
 *
 * The api-gateway returns atomic USDC as stringified bigints; we render
 * dollars in the UI. Use `atomicToUsd` everywhere — never `.toFixed()`
 * raw atomic values.
 */

/** Convert atomic USDC (6 decimals) to a display string like "$0.0001". */
export function atomicToUsd(atomic: string | bigint | number): string {
  const big = typeof atomic === 'bigint' ? atomic : BigInt(atomic);
  const dollars = Number(big) / 1e6;
  if (dollars >= 1000) return `$${dollars.toFixed(0)}`;
  if (dollars >= 1) return `$${dollars.toFixed(2)}`;
  return `$${dollars.toFixed(4)}`;
}

/** Same as atomicToUsd but always 4 decimals — used for chart axis labels. */
export function atomicToUsdShort(atomic: string | bigint | number): string {
  const big = typeof atomic === 'bigint' ? atomic : BigInt(atomic);
  const dollars = Number(big) / 1e6;
  return `$${dollars.toFixed(4)}`;
}

/** Convert atomic USDC to a plain number of dollars. Used by chart values. */
export function atomicToDollarsNumber(atomic: string | bigint | number): number {
  const big = typeof atomic === 'bigint' ? atomic : BigInt(atomic);
  return Number(big) / 1e6;
}

/** "2m ago", "3h ago", "5d ago". Falls back to a locale date for older entries. */
export function timeAgo(unixSeconds: number, now: number = Math.floor(Date.now() / 1000)): string {
  const diff = Math.max(0, now - unixSeconds);
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString();
}

/** Short "2m" / "3h" — no "ago" — used in compact tables. */
export function timeAgoShort(unixSeconds: number, now: number = Math.floor(Date.now() / 1000)): string {
  const diff = Math.max(0, now - unixSeconds);
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d`;
  return new Date(unixSeconds * 1000).toLocaleDateString();
}

/** 0x6Fb2000000000000000000000000000000009aE1 → 0x6Fb2…9aE1 */
export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Map a daily date to the day-of-week chart label, e.g. 2026-06-04 → "Thu". */
export function isoDateToDow(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()] ?? iso;
}

/** YYYY-MM-DD → "Jun 4" for monthly view. */
export function isoDateToShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
