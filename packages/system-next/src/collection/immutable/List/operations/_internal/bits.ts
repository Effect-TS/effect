import type { List } from "../../definition"

export const BranchingFactor = 32
export const BranchBits = 5
export const Mask = 31

// A bit field is stored in each `List`. From right to left, the first five
// bits are suffix length, the next five are prefix length and the
// rest is depth. The functions below are for working with the bits in
// a sane way.

const affixBits = 6
const affixMask = 0b111111

export function getSuffixSize(l: List<any>): number {
  return l.bits & affixMask
}

export function getPrefixSize(l: List<any>): number {
  return (l.bits >> affixBits) & affixMask
}

export function getDepth(l: List<any>): number {
  return l.bits >> (affixBits * 2)
}

export function setPrefix(size: number, bits: number): number {
  return (size << affixBits) | (bits & ~(affixMask << affixBits))
}

export function setSuffix(size: number, bits: number): number {
  return size | (bits & ~affixMask)
}

export function setDepth(depth: number, bits: number): number {
  return (depth << (affixBits * 2)) | (bits & (affixMask | (affixMask << affixBits)))
}

export function incrementPrefix(bits: number): number {
  return bits + (1 << affixBits)
}

export function incrementSuffix(bits: number): number {
  return bits + 1
}

export function incrementDepth(bits: number): number {
  return bits + (1 << (affixBits * 2))
}

export function decrementDepth(bits: number): number {
  return bits - (1 << (affixBits * 2))
}
