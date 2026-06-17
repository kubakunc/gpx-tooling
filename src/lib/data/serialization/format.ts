/**
 * Number formatting helpers for serializers. JavaScript's default
 * `Number.toString()` emits exponential notation for small magnitudes
 * (e.g. `0.0000005` → `"5e-7"`), which is invalid in GPX/TCX/KML numeric
 * fields. These helpers produce plain decimal strings.
 */

/** Strip trailing zeros (and a dangling decimal point) from a fixed string. */
function stripTrailingZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/\.?0+$/, '');
}

/**
 * Format a coordinate (lat/lon) as a plain decimal with up to 7 fractional
 * digits (~1 cm precision), never exponential. Trailing zeros are stripped.
 *   formatCoord(0.0000005) → "0.0000005"  (not "5e-7")
 *   formatCoord(45)        → "45"
 *   formatCoord(-15.5)     → "-15.5"
 */
export function formatCoord(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return stripTrailingZeros(n.toFixed(7));
}

/**
 * Format a general number (elevation etc.) as a plain decimal, never
 * exponential. Integers render without a decimal point; otherwise up to 7
 * fractional digits with trailing zeros stripped.
 *   formatNum(100)    → "100"
 *   formatNum(12.34)  → "12.34"
 *   formatNum(5e-7)   → "0.0000005"
 */
export function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (Number.isInteger(n)) return String(n);
  return stripTrailingZeros(n.toFixed(7));
}
