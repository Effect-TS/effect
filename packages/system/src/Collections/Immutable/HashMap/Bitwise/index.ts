// ets_tracing: off

import { MASK } from "../Config/index.js"

// Bit Ops

/**
 * Hamming weight.
 *
 * Taken from: http://jsperf.com/hamming-weight
 */
export function popcount(x: number) {
  x -= (x >> 1) & 0x55555555
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333)
  x = (x + (x >> 4)) & 0x0f0f0f0f
  x += x >> 8
  x += x >> 16
  return x & 0x7f
}

export function hashFragment(shift: number, h: number) {
  return (h >>> shift) & MASK
}

export function toBitmap(x: number) {
  return 1 << x
}

export function fromBitmap(bitmap: number, bit: number) {
  return popcount(bitmap & (bit - 1))
}
