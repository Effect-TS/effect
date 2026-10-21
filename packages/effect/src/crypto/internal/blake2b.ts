/**
 * Adapted from noble-hashes, Copyright (c) 2022 Paul Miller.
 * MIT; source revision 8060cc83bbab6681d23c9eed071db3f3a6b442da.
 * See ../NOTICE.md for source mapping and license.
 *
 * @internal
 */
import * as u64 from "./word64.ts"

const B2B_IV = /* @__PURE__ */ Uint32Array.from([
  0xf3bcc908,
  0x6a09e667,
  0x84caa73b,
  0xbb67ae85,
  0xfe94f82b,
  0x3c6ef372,
  0x5f1d36f1,
  0xa54ff53a,
  0xade682d1,
  0x510e527f,
  0x2b3e6c1f,
  0x9b05688c,
  0xfb41bd6b,
  0x1f83d9ab,
  0x137e2179,
  0x5be0cd19
])

const BSIGMA = /* @__PURE__ */ Uint8Array.from([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9,
  12,
  5,
  1,
  15,
  14,
  13,
  4,
  10,
  0,
  7,
  6,
  3,
  9,
  2,
  8,
  11,
  13,
  11,
  7,
  14,
  12,
  1,
  3,
  9,
  5,
  0,
  15,
  4,
  8,
  6,
  2,
  10,
  6,
  15,
  14,
  9,
  11,
  3,
  0,
  8,
  12,
  2,
  13,
  7,
  1,
  4,
  10,
  5,
  10,
  2,
  8,
  4,
  7,
  6,
  1,
  5,
  15,
  11,
  9,
  14,
  3,
  12,
  13,
  0,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3
])

// BLAKE2b G mix split into two half-rounds over LE u32 low/high limbs.
function G1b(
  BBUF: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number,
  msg: Uint32Array,
  x: number
) {
  // NOTE: V is LE here
  const Xl = msg[x],
    Xh = msg[x + 1]

  let Al = BBUF[2 * a],
    Ah = BBUF[2 * a + 1]

  let Bl = BBUF[2 * b],
    Bh = BBUF[2 * b + 1]

  let Cl = BBUF[2 * c],
    Ch = BBUF[2 * c + 1]

  let Dl = BBUF[2 * d],
    Dh = BBUF[2 * d + 1]

  // v[a] = (v[a] + v[b] + x) | 0;
  const ll = u64.add3L(Al, Bl, Xl)

  Ah = u64.add3H(ll, Ah, Bh, Xh)
  Al = ll | 0

  // v[d] = rotr(v[d] ^ v[a], 32)
  let xh = Dh ^ Ah,
    xl = Dl ^ Al

  Dh = u64.rotr32H(xh, xl)
  Dl = u64.rotr32L(xh, xl) // v[c] = (v[c] + v[d]) | 0;
  ;({ h: Ch, l: Cl } = u64.add(Ch, Cl, Dh, Dl))
  // v[b] = rotr(v[b] ^ v[c], 24)
  xh = Bh ^ Ch
  xl = Bl ^ Cl
  Bh = u64.rotrSH(xh, xl, 24)
  Bl = u64.rotrSL(xh, xl, 24)
  BBUF[2 * a] = Al
  BBUF[2 * a + 1] = Ah
  BBUF[2 * b] = Bl
  BBUF[2 * b + 1] = Bh
  BBUF[2 * c] = Cl
  BBUF[2 * c + 1] = Ch
  BBUF[2 * d] = Dl
  BBUF[2 * d + 1] = Dh
}

// Second half-round of the same LE-limb BLAKE2b G mix; `x` is the message word offset.
function G2b(
  BBUF: Uint32Array,
  a: number,
  b: number,
  c: number,
  d: number,
  msg: Uint32Array,
  x: number
) {
  // NOTE: V is LE here
  const Xl = msg[x],
    Xh = msg[x + 1]

  let Al = BBUF[2 * a],
    Ah = BBUF[2 * a + 1]

  let Bl = BBUF[2 * b],
    Bh = BBUF[2 * b + 1]

  let Cl = BBUF[2 * c],
    Ch = BBUF[2 * c + 1]

  let Dl = BBUF[2 * d],
    Dh = BBUF[2 * d + 1]

  // v[a] = (v[a] + v[b] + x) | 0;
  const ll = u64.add3L(Al, Bl, Xl)

  Ah = u64.add3H(ll, Ah, Bh, Xh)
  Al = ll | 0

  // v[d] = rotr(v[d] ^ v[a], 16)
  let xh = Dh ^ Ah,
    xl = Dl ^ Al

  Dh = u64.rotrSH(xh, xl, 16)
  Dl = u64.rotrSL(xh, xl, 16) // v[c] = (v[c] + v[d]) | 0;
  ;({ h: Ch, l: Cl } = u64.add(Ch, Cl, Dh, Dl))
  // v[b] = rotr(v[b] ^ v[c], 63)
  xh = Bh ^ Ch
  xl = Bl ^ Cl
  Bh = u64.rotrBH(xh, xl, 63)
  Bl = u64.rotrBL(xh, xl, 63)
  BBUF[2 * a] = Al
  BBUF[2 * a + 1] = Ah
  BBUF[2 * b] = Bl
  BBUF[2 * b + 1] = Bh
  BBUF[2 * c] = Cl
  BBUF[2 * c + 1] = Ch
  BBUF[2 * d] = Dl
  BBUF[2 * d + 1] = Dh
}

/**
 * Unkeyed BLAKE2b used by Argon2's H0 and variable-length H'.
 *
 * @internal
 */
export class Blake2b {
  private readonly state = B2B_IV.slice()
  private readonly buffer = new Uint8Array(128)
  private readonly words = new Uint32Array(32)
  private readonly mixed = new Uint32Array(32)
  private readonly view = new DataView(this.buffer.buffer)
  private length = 0
  private position = 0

  private readonly outputLength: number

  constructor(outputLength = 64) {
    this.outputLength = outputLength
    this.state[0] ^= 0x01010000 ^ outputLength
  }

  update(data: Uint8Array): this {
    for (let position = 0; position < data.length;) {
      // BLAKE2 must retain the last block until its finalization flag is known.
      if (this.position === 128) {
        this.compress(false)
        this.position = 0
      }
      const take = Math.min(128 - this.position, data.length - position)

      this.buffer.set(data.subarray(position, position + take), this.position)
      this.position += take
      this.length += take
      position += take
    }

    return this
  }

  private compress(last: boolean): void {
    const BBUF = this.mixed
    const msg = this.words

    for (let i = 0; i < 32; i++) msg[i] = this.view.getUint32(i * 4, true)
    BBUF.set(this.state)
    BBUF.set(B2B_IV, 16)
    BBUF[24] ^= this.length >>> 0
    BBUF[25] ^= (this.length / 0x100000000) | 0
    if (last) {
      BBUF[28] = ~BBUF[28]
      BBUF[29] = ~BBUF[29]
    }
    let j = 0
    const s = BSIGMA

    // SIGMA selects 64-bit message words; multiply by 2 because `msg` stores
    // each word as [low32, high32].
    for (let i = 0; i < 12; i++) {
      G1b(BBUF, 0, 4, 8, 12, msg, 2 * s[j++])
      G2b(BBUF, 0, 4, 8, 12, msg, 2 * s[j++])
      G1b(BBUF, 1, 5, 9, 13, msg, 2 * s[j++])
      G2b(BBUF, 1, 5, 9, 13, msg, 2 * s[j++])
      G1b(BBUF, 2, 6, 10, 14, msg, 2 * s[j++])
      G2b(BBUF, 2, 6, 10, 14, msg, 2 * s[j++])
      G1b(BBUF, 3, 7, 11, 15, msg, 2 * s[j++])
      G2b(BBUF, 3, 7, 11, 15, msg, 2 * s[j++])

      G1b(BBUF, 0, 5, 10, 15, msg, 2 * s[j++])
      G2b(BBUF, 0, 5, 10, 15, msg, 2 * s[j++])
      G1b(BBUF, 1, 6, 11, 12, msg, 2 * s[j++])
      G2b(BBUF, 1, 6, 11, 12, msg, 2 * s[j++])
      G1b(BBUF, 2, 7, 8, 13, msg, 2 * s[j++])
      G2b(BBUF, 2, 7, 8, 13, msg, 2 * s[j++])
      G1b(BBUF, 3, 4, 9, 14, msg, 2 * s[j++])
      G2b(BBUF, 3, 4, 9, 14, msg, 2 * s[j++])
    }

    for (let i = 0; i < 16; i++) this.state[i] ^= BBUF[i] ^ BBUF[i + 16]
    BBUF.fill(0)
    msg.fill(0)
  }

  digest(): Uint8Array {
    try {
      this.buffer.fill(0, this.position)
      this.compress(true)
      const out = new Uint8Array(this.outputLength)

      for (let i = 0; i < out.length; i++) out[i] = this.state[i >>> 2] >>> (8 * (i & 3))

      return out
    } finally {
      this.destroy()
    }
  }

  destroy(): void {
    this.state.fill(0)
    this.buffer.fill(0)
    this.words.fill(0)
    this.mixed.fill(0)
    this.length = 0
    this.position = 0
  }
}
