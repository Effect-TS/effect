/**
 * Adapted from noble-hashes, Copyright (c) 2022 Paul Miller.
 * MIT; source revision 8060cc83bbab6681d23c9eed071db3f3a6b442da.
 * See ../NOTICE.md for source mapping and license.
 *
 * @internal
 */
// High 32-bit half of a 64-bit right rotate, valid for `s` in `1..31`.
/** @internal */
export const rotrSH = (h: number, l: number, s: number): number => (h >>> s) | (l << (32 - s))
// Low 32-bit half of a 64-bit right rotate, valid for `s` in `1..31`.
/** @internal */
export const rotrSL = (h: number, l: number, s: number): number => (h << (32 - s)) | (l >>> s)

// High 32-bit half of a 64-bit right rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
/** @internal */
export const rotrBH = (h: number, l: number, s: number): number => (h << (64 - s)) | (l >>> (s - 32))

// Low 32-bit half of a 64-bit right rotate, valid for `s` in `33..63`; `32` uses `rotr32*`.
/** @internal */
export const rotrBL = (h: number, l: number, s: number): number => (h >>> (s - 32)) | (l << (64 - s))

// High 32-bit half of a 64-bit right rotate for `s === 32`; this is just the swapped low half.
/** @internal */
export const rotr32H = (_h: number, l: number): number => l
// Low 32-bit half of a 64-bit right rotate for `s === 32`; this is just the swapped high half.
/** @internal */
export const rotr32L = (h: number, _l: number): number => h

// Add two split 64-bit words and return the split `{ h, l }` sum.
// JS uses 32-bit signed integers for bitwise operations, so we cannot simply shift the carry out
// of the low sum and instead use division.
/** @internal */
export function add(
  Ah: number,
  Al: number,
  Bh: number,
  Bl: number
): {
  h: number
  l: number
} {
  const l = (Al >>> 0) + (Bl >>> 0)

  return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 }
}

// Addition with more than 2 elements
// Unmasked low-word accumulator for 3-way addition; pass the raw result into `add3H(...)`.
/** @internal */
export const add3L = (Al: number, Bl: number, Cl: number): number => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0)

// High-word finalize step for 3-way addition; `low` must be the untruncated output of `add3L(...)`.
/** @internal */
export const add3H = (low: number, Ah: number, Bh: number, Ch: number): number =>
  (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0
