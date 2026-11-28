// XXH64 with seed 0, as used by the Zstandard content checksum (RFC 8878
// §3.1.1). Specification:
// https://github.com/Cyan4973/xxHash/blob/v0.8.2/doc/xxhash_spec.md
//
// 64-bit values are kept as two unsigned 32-bit halves so the hash runs on
// plain numbers instead of BigInt.

const P1H = 0x9E3779B1
const P1L = 0x85EBCA87
const P2H = 0xC2B2AE3D
const P2L = 0x27D4EB4F
const P3H = 0x165667B1
const P3L = 0x9E3779F9
const P4H = 0x85EBCA77
const P4L = 0xC2B2AE63
const P5H = 0x27D4EB2F
const P5L = 0x165667C5

// High 32 bits of x * y for unsigned 32-bit x and y, on 16-bit limbs so every
// partial sum is exact
const hi32 = (x: number, y: number): number => {
  const x1 = x >>> 16, x0 = x & 0xFFFF, y1 = y >>> 16, y0 = y & 0xFFFF
  const u = x1 * y0 + ((x0 * y0) >>> 16)
  const w = (u & 0xFFFF) + x0 * y1
  return x1 * y1 + (u >>> 16) + (w >>> 16)
}

// The finalization works on `h` through these helpers; results are stored in
// a typed array rather than returned as pairs to avoid allocating
const h = new Uint32Array(2) // [high, low]

// h = h * (bh:bl) mod 2^64
const mulH = (bh: number, bl: number): void => {
  const ah = h[0], al = h[1]
  h[0] = hi32(al, bl) + Math.imul(ah, bl) + Math.imul(al, bh)
  h[1] = Math.imul(al, bl)
}

// h = h + (bh:bl) mod 2^64
const addH = (bh: number, bl: number): void => {
  const lo = h[1] + bl
  h[0] = h[0] + bh + (lo > 0xFFFFFFFF ? 1 : 0)
  h[1] = lo
}

// h = rotl(h, r) for 0 < r < 32
const rotlH = (r: number): void => {
  const ah = h[0], al = h[1]
  h[0] = (ah << r) | (al >>> (32 - r))
  h[1] = (al << r) | (ah >>> (32 - r))
}

// h = h + rotl(v, r) for 0 < r < 32
const addRotlH = (vh: number, vl: number, r: number): void =>
  addH((vh << r) | (vl >>> (32 - r)), ((vl << r) | (vh >>> (32 - r))) >>> 0)

// h = h ^ (v * (ph:pl)) for an unsigned 32-bit v
const xorMulH = (v: number, ph: number, pl: number): void => {
  h[0] ^= hi32(v, pl) + Math.imul(v, ph)
  h[1] ^= Math.imul(v, pl)
}

// h = h ^ round(0, v), where round(0, v) = rotl(v * P2, 31) * P1
const xorRoundH = (vh: number, vl: number): void => {
  const ah = h[0], al = h[1]
  h[0] = vh
  h[1] = vl
  mulH(P2H, P2L)
  rotlH(31)
  mulH(P1H, P1L)
  h[0] ^= ah
  h[1] ^= al
}

// h = (h ^ round(0, v)) * P1 + P4
const mergeH = (vh: number, vl: number): void => {
  xorRoundH(vh, vl)
  mulH(P1H, P1L)
  addH(P4H, P4L)
}

const u32 = (data: Uint8Array, i: number): number =>
  (data[i] | (data[i + 1] << 8) | (data[i + 2] << 16) | (data[i + 3] << 24)) >>> 0

/**
 * The XXH64 hash of `data` with seed 0, as its high and low 32-bit halves.
 *
 * @internal
 */
export const xxhash64 = (data: Uint8Array): { readonly high: number; readonly low: number } => {
  const length = data.length
  let p = 0
  if (length >= 32) {
    // v1 = P1 + P2, v2 = P2, v3 = 0, v4 = -P1. Each 8-byte lane is
    // v = rotl(v + input * P2, 31) * P1, written out for speed. The lanes
    // hold signed 32-bit halves, which V8 keeps unboxed.
    let v1h = 0x60EA27EE, v1l = 0xADC0B5D6 | 0
    let v2h = P2H | 0, v2l = P2L
    let v3h = 0, v3l = 0
    let v4h = 0x61C8864E, v4l = 0x7A143579
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
    for (const limit = length - 32; p <= limit; p += 32) {
      {
        const il = view.getInt32(p + 0, true), ih = view.getInt32(p + 4, true)
        const tl = Math.imul(il, P2L)
        const th = (hi32(il, P2L) + Math.imul(ih, P2L) + Math.imul(il, P2H)) | 0
        const sl = (v1l + tl) | 0
        const sh = (v1h + th + ((sl >>> 0) < (tl >>> 0) ? 1 : 0)) | 0
        const rh = (sh << 31) | (sl >>> 1), rl = (sl << 31) | (sh >>> 1)
        v1l = Math.imul(rl, P1L)
        v1h = (hi32(rl, P1L) + Math.imul(rh, P1L) + Math.imul(rl, P1H)) | 0
      }
      {
        const il = view.getInt32(p + 8, true), ih = view.getInt32(p + 12, true)
        const tl = Math.imul(il, P2L)
        const th = (hi32(il, P2L) + Math.imul(ih, P2L) + Math.imul(il, P2H)) | 0
        const sl = (v2l + tl) | 0
        const sh = (v2h + th + ((sl >>> 0) < (tl >>> 0) ? 1 : 0)) | 0
        const rh = (sh << 31) | (sl >>> 1), rl = (sl << 31) | (sh >>> 1)
        v2l = Math.imul(rl, P1L)
        v2h = (hi32(rl, P1L) + Math.imul(rh, P1L) + Math.imul(rl, P1H)) | 0
      }
      {
        const il = view.getInt32(p + 16, true), ih = view.getInt32(p + 20, true)
        const tl = Math.imul(il, P2L)
        const th = (hi32(il, P2L) + Math.imul(ih, P2L) + Math.imul(il, P2H)) | 0
        const sl = (v3l + tl) | 0
        const sh = (v3h + th + ((sl >>> 0) < (tl >>> 0) ? 1 : 0)) | 0
        const rh = (sh << 31) | (sl >>> 1), rl = (sl << 31) | (sh >>> 1)
        v3l = Math.imul(rl, P1L)
        v3h = (hi32(rl, P1L) + Math.imul(rh, P1L) + Math.imul(rl, P1H)) | 0
      }
      {
        const il = view.getInt32(p + 24, true), ih = view.getInt32(p + 28, true)
        const tl = Math.imul(il, P2L)
        const th = (hi32(il, P2L) + Math.imul(ih, P2L) + Math.imul(il, P2H)) | 0
        const sl = (v4l + tl) | 0
        const sh = (v4h + th + ((sl >>> 0) < (tl >>> 0) ? 1 : 0)) | 0
        const rh = (sh << 31) | (sl >>> 1), rl = (sl << 31) | (sh >>> 1)
        v4l = Math.imul(rl, P1L)
        v4h = (hi32(rl, P1L) + Math.imul(rh, P1L) + Math.imul(rl, P1H)) | 0
      }
    }
    // h = rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)
    h[0] = h[1] = 0
    addRotlH(v1h, v1l, 1)
    addRotlH(v2h, v2l, 7)
    addRotlH(v3h, v3l, 12)
    addRotlH(v4h, v4l, 18)
    mergeH(v1h, v1l)
    mergeH(v2h, v2l)
    mergeH(v3h, v3l)
    mergeH(v4h, v4l)
  } else {
    h[0] = P5H
    h[1] = P5L
  }
  addH(Math.floor(length / 0x100000000), length >>> 0)
  for (; p + 8 <= length; p += 8) {
    xorRoundH(u32(data, p + 4), u32(data, p))
    rotlH(27)
    mulH(P1H, P1L)
    addH(P4H, P4L)
  }
  if (p + 4 <= length) {
    xorMulH(u32(data, p), P1H, P1L)
    rotlH(23)
    mulH(P2H, P2L)
    addH(P3H, P3L)
    p += 4
  }
  for (; p < length; p++) {
    xorMulH(data[p], P5H, P5L)
    rotlH(11)
    mulH(P1H, P1L)
  }
  // Avalanche: h ^= h >> 33; h *= P2; h ^= h >> 29; h *= P3; h ^= h >> 32
  h[1] ^= h[0] >>> 1
  mulH(P2H, P2L)
  h[1] ^= (h[1] >>> 29) | (h[0] << 3)
  h[0] ^= h[0] >>> 29
  mulH(P3H, P3L)
  h[1] ^= h[0]
  return { high: h[0], low: h[1] }
}
