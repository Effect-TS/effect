// xxHash32, as used by the LZ4 frame format for its header, block and content
// checksums: https://github.com/Cyan4973/xxHash/blob/release/doc/xxhash_spec.md

const P1 = 0x9e3779b1 | 0
const P2 = 0x85ebca77 | 0
const P3 = 0xc2b2ae3d | 0
const P4 = 0x27d4eb2f | 0
const P5 = 0x165667b1 | 0

const rotl = (x: number, r: number): number => (x << r) | (x >>> (32 - r))

const read32 = (b: Uint8Array, i: number): number => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)

const round = (acc: number, lane: number): number => Math.imul(rotl((acc + Math.imul(lane, P2)) | 0, 13), P1)

/**
 * The xxHash32 digest of `input[start, end)` with seed 0, as an unsigned
 * 32-bit number.
 *
 * @internal
 */
export const xxh32 = (input: Uint8Array, start: number, end: number): number => {
  let i = start
  let acc: number
  if (end - start >= 16) {
    let v1 = (P1 + P2) | 0
    let v2 = P2
    let v3 = 0
    let v4 = -P1
    const limit = end - 16
    while (i <= limit) {
      v1 = round(v1, read32(input, i))
      v2 = round(v2, read32(input, i + 4))
      v3 = round(v3, read32(input, i + 8))
      v4 = round(v4, read32(input, i + 12))
      i += 16
    }
    acc = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) | 0
  } else {
    acc = P5
  }
  acc = (acc + (end - start)) | 0
  while (i + 4 <= end) {
    acc = Math.imul(rotl((acc + Math.imul(read32(input, i), P3)) | 0, 17), P4)
    i += 4
  }
  while (i < end) {
    acc = Math.imul(rotl((acc + Math.imul(input[i], P5)) | 0, 11), P1)
    i++
  }
  acc = Math.imul(acc ^ (acc >>> 15), P2)
  acc = Math.imul(acc ^ (acc >>> 13), P3)
  return (acc ^ (acc >>> 16)) >>> 0
}
