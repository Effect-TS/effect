// copyright https://github.com/frptools

export const SIZE = 5
export const BUCKET_SIZE = Math.pow(2, SIZE)
export const MASK = BUCKET_SIZE - 1
export const MAX_INDEX_NODE = BUCKET_SIZE / 2
export const MIN_ARRAY_NODE = BUCKET_SIZE / 4

export function hammingWeight(num: number): number {
  num = num - ((num >> 1) & 0x55555555)
  num = (num & 0x33333333) + ((num >> 2) & 0x33333333)
  return (((num + (num >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24
}

export function hashFragment(shift: number, hash: number) {
  return (hash >>> shift) & MASK
}

export function toBitmap(num: number) {
  return 1 << num
}

export function bitmapToIndex(shift: number, bitmap: number) {
  return hammingWeight(shift & (bitmap - 1))
}

export function stringHash(str: string): number {
  let hash = 0

  for (let i = 0; i < str.length; ++i) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }

  return hash
}
