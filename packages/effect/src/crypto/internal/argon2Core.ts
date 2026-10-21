/**
 * Adapted from noble-hashes, Copyright (c) 2022 Paul Miller.
 * MIT; source revision 8060cc83bbab6681d23c9eed071db3f3a6b442da.
 * See ../NOTICE.md for source mapping and license.
 *
 * @internal
 */
import { Blake2b } from "./blake2b.ts"
import type { Argon2Parameters } from "./kdf.ts"
import { rotr32H, rotr32L, rotrBH, rotrBL, rotrSH, rotrSL } from "./word64.ts"

const ARGON2_SYNC_POINTS = 4

/** @internal */
export const BLOCKS_PER_BATCH = 256

// Unsigned `u32 * u32 = { h, l }`, returned as split 64-bit halves.
function mul(a: number, b: number) {
  // Split into 16-bit limbs so each partial product stays exact under `Math.imul`.
  const aL = a & 0xffff
  const aH = a >>> 16
  const bL = b & 0xffff
  const bH = b >>> 16
  const ll = Math.imul(aL, bL)
  const hl = Math.imul(aH, bL)
  const lh = Math.imul(aL, bH)
  const hh = Math.imul(aH, bH)
  const carry = (ll >>> 16) + (hl & 0xffff) + lh
  const high = (hh + (hl >>> 16) + (carry >>> 16)) | 0
  const low = (carry << 16) | (ll & 0xffff)

  return { h: high, l: low }
}

// High 32 bits of unsigned u32 multiply, via the same 16-bit limb split as `mul`.
function mulHi(a: number, b: number): number {
  const aL = a & 0xffff,
    aH = a >>> 16,
    bL = b & 0xffff,
    bH = b >>> 16

  const carry = (Math.imul(aL, bL) >>> 16) + (Math.imul(aH, bL) & 0xffff) + Math.imul(aL, bH)

  return (Math.imul(aH, bH) + (Math.imul(aH, bL) >>> 16) + (carry >>> 16)) | 0
}

// 1024-byte block: 256 u32 = 128 interleaved low/high halves = RFC's
// 8x8 matrix of 16-byte registers.

// Quarter-round over 64-bit word indices into `A2_BUF`; each index maps to adjacent low/high u32s.
// Each BlaMka step `X = X + Y + 2 * trunc(X) * trunc(Y)` (trunc = low 32 bits) is three lines:
// `Math.imul` is the low product half, `mulHi` the high half, then a split 64-bit add with the
// doubling folded in. RFC 9106 Figure 19 GB rotates by 32, 24, 16, and 63 bits after each XOR.
function G(A2_BUF: Uint32Array, a: number, b: number, c: number, d: number) {
  let Al = A2_BUF[2 * a],
    Ah = A2_BUF[2 * a + 1]

  let Bl = A2_BUF[2 * b],
    Bh = A2_BUF[2 * b + 1]

  let Cl = A2_BUF[2 * c],
    Ch = A2_BUF[2 * c + 1]

  let Dl = A2_BUF[2 * d],
    Dh = A2_BUF[2 * d + 1]

  let ml = 0,
    mh = 0,
    rl = 0,
    xh = 0,
    xl = 0

  // A = blamka(A, B); D = rotr64(D ^ A, 32)
  ml = Math.imul(Al, Bl)
  mh = mulHi(Al, Bl)
  rl = (Al >>> 0) + (Bl >>> 0) + ((ml << 1) >>> 0)
  Ah = (Ah + Bh + ((mh << 1) | (ml >>> 31)) + ((rl / 0x100000000) | 0)) | 0
  Al = rl | 0
  xh = Dh ^ Ah
  xl = Dl ^ Al
  Dh = rotr32H(xh, xl)
  Dl = rotr32L(xh, xl)

  // C = blamka(C, D); B = rotr64(B ^ C, 24)
  ml = Math.imul(Cl, Dl)
  mh = mulHi(Cl, Dl)
  rl = (Cl >>> 0) + (Dl >>> 0) + ((ml << 1) >>> 0)
  Ch = (Ch + Dh + ((mh << 1) | (ml >>> 31)) + ((rl / 0x100000000) | 0)) | 0
  Cl = rl | 0
  xh = Bh ^ Ch
  xl = Bl ^ Cl
  Bh = rotrSH(xh, xl, 24)
  Bl = rotrSL(xh, xl, 24)

  // A = blamka(A, B); D = rotr64(D ^ A, 16)
  ml = Math.imul(Al, Bl)
  mh = mulHi(Al, Bl)
  rl = (Al >>> 0) + (Bl >>> 0) + ((ml << 1) >>> 0)
  Ah = (Ah + Bh + ((mh << 1) | (ml >>> 31)) + ((rl / 0x100000000) | 0)) | 0
  Al = rl | 0
  xh = Dh ^ Ah
  xl = Dl ^ Al
  Dh = rotrSH(xh, xl, 16)
  Dl = rotrSL(xh, xl, 16)

  // C = blamka(C, D); B = rotr64(B ^ C, 63)
  ml = Math.imul(Cl, Dl)
  mh = mulHi(Cl, Dl)
  rl = (Cl >>> 0) + (Dl >>> 0) + ((ml << 1) >>> 0)
  Ch = (Ch + Dh + ((mh << 1) | (ml >>> 31)) + ((rl / 0x100000000) | 0)) | 0
  Cl = rl | 0
  xh = Bh ^ Ch
  xl = Bl ^ Cl
  Bh = rotrBH(xh, xl, 63)
  Bl = rotrBL(xh, xl, 63)

  A2_BUF[2 * a] = Al
  A2_BUF[2 * a + 1] = Ah
  A2_BUF[2 * b] = Bl
  A2_BUF[2 * b + 1] = Bh
  A2_BUF[2 * c] = Cl
  A2_BUF[2 * c + 1] = Ch
  A2_BUF[2 * d] = Dl
  A2_BUF[2 * d + 1] = Dh
}

// Argon2 permutation over 16 register indices into `A2_BUF`, not the register values themselves.
// RFC 9106 Figure 17: these arguments are the 16 `v0..v15` 64-bit word
// indices inside eight 16-byte inputs, not copied word values.
function P(
  A2_BUF: Uint32Array,
  v00: number,
  v01: number,
  v02: number,
  v03: number,
  v04: number,
  v05: number,
  v06: number,
  v07: number,
  v08: number,
  v09: number,
  v10: number,
  v11: number,
  v12: number,
  v13: number,
  v14: number,
  v15: number
) {
  // RFC 9106 Figure 18: first apply GB across rows, then across columns of the 8x8 register matrix.
  G(A2_BUF, v00, v04, v08, v12)
  G(A2_BUF, v01, v05, v09, v13)
  G(A2_BUF, v02, v06, v10, v14)
  G(A2_BUF, v03, v07, v11, v15)
  G(A2_BUF, v00, v05, v10, v15)
  G(A2_BUF, v01, v06, v11, v12)
  G(A2_BUF, v02, v07, v08, v13)
  G(A2_BUF, v03, v04, v09, v14)
}

function block(
  A2_BUF: Uint32Array,
  x: Uint32Array,
  xPos: number,
  yPos: number,
  outPos: number,
  needXor: boolean
) {
  for (let i = 0; i < 256; i++) A2_BUF[i] = x[xPos + i] ^ x[yPos + i]
  // rows (8 consecutive 16-register groups)
  for (let i = 0; i < 128; i += 16) {
    P(
      A2_BUF,
      i,
      i + 1,
      i + 2,
      i + 3,
      i + 4,
      i + 5,
      i + 6,
      i + 7,
      i + 8,
      i + 9,
      i + 10,
      i + 11,
      i + 12,
      i + 13,
      i + 14,
      i + 15
    )
  }
  // columns (8 strided 16-register groups)
  for (let i = 0; i < 16; i += 2) {
    P(
      A2_BUF,
      i,
      i + 1,
      i + 16,
      i + 17,
      i + 32,
      i + 33,
      i + 48,
      i + 49,
      i + 64,
      i + 65,
      i + 80,
      i + 81,
      i + 96,
      i + 97,
      i + 112,
      i + 113
    )
  }

  // RFC 9106 step 6: passes after the first XOR the old destination block into the new G(X, Y).
  if (needXor) { for (let i = 0; i < 256; i++) x[outPos + i] ^= A2_BUF[i] ^ x[xPos + i] ^ x[yPos + i] }
  else for (let i = 0; i < 256; i++) x[outPos + i] = A2_BUF[i] ^ x[xPos + i] ^ x[yPos + i]
  A2_BUF.fill(0)
}

// Used only inside argon2Blocks!
function indexAlpha(
  r: number,
  s: number,
  laneLen: number,
  segmentLen: number,
  index: number,
  randL: number,
  sameLane: boolean = false
) {
  // RFC 9106 §3.4.2 Figures 12-13: map `J1` / `J2` into the current lane's reference area `W`.
  let area: number

  if (r === 0) {
    if (s === 0) area = index - 1
    else if (sameLane) area = s * segmentLen + index - 1
    else area = s * segmentLen + (index === 0 ? -1 : 0)
  } else if (sameLane) area = laneLen - segmentLen + index - 1
  else area = laneLen - segmentLen + (index === 0 ? -1 : 0)
  const startPos = r !== 0 && s !== ARGON2_SYNC_POINTS - 1 ? (s + 1) * segmentLen : 0
  // RFC 9106 Figure 13: `mul(randL, randL).h` is `floor(J_1^2 / 2^32)`, and the outer high-half
  // multiply computes `floor(|W| * x / 2^32)` without floating-point math.
  const rel = area - 1 - mul(area, mul(randL, randL).h).h

  return (startPos + rel) % laneLen
}

const bytesOfWords = (words: Uint32Array): Uint8Array => {
  const bytes = new Uint8Array(words.length * 4)
  const view = new DataView(bytes.buffer)

  for (let i = 0; i < words.length; i++) view.setUint32(i * 4, words[i], true)

  return bytes
}

const hash = (data: Uint8Array, length = 64) => {
  const state = new Blake2b(length)

  try {
    return state.update(data).digest()
  } finally {
    state.destroy()
  }
}

// RFC 9106 H': preserve byte tails, including output lengths not divisible by four.
function variableHash(words: Uint32Array, length: number): Uint8Array {
  const data = bytesOfWords(words)
  const prefix = new Uint8Array(4)

  new DataView(prefix.buffer).setUint32(0, length, true)
  const state = new Blake2b(Math.min(length, 64))
  let previous: Uint8Array | undefined
  let out: Uint8Array | undefined

  try {
    previous = state.update(prefix).update(data).digest()
    if (length <= 64) {
      const result = previous

      previous = undefined

      return result
    }
    out = new Uint8Array(length)
    out.set(previous.subarray(0, 32))
    let position = 32

    for (; length - position > 64; position += 32) {
      const next = hash(previous)

      previous.fill(0)
      previous = next
      out.set(previous.subarray(0, 32), position)
    }
    const last = hash(previous, length - position)

    out.set(last, position)
    last.fill(0)

    return out
  } catch (error) {
    out?.fill(0)
    // oxlint-disable-next-line effect/no-untyped-throw -- Synchronous primitive rethrows the original host failure after wiping secret buffers; the Effect adapter classifies it.
    throw error
  } finally {
    state.destroy()
    previous?.fill(0)
    prefix.fill(0)
    data.fill(0)
  }
}

/** @internal */
export interface State {
  readonly memory: Uint32Array
  readonly scratch: Uint32Array
  readonly address: Uint32Array
  readonly initial: Uint32Array
  readonly final: Uint32Array
  readonly blocks: number
  readonly laneLength: number
  readonly segmentLength: number
}

/**
 * Allocates work buffers before absorbing secrets. The KDF adapter validates
 * algorithm parameters; resource ceilings belong to the caller's limits wrapper.
 *
 * @internal
 */
export const allocate = (
  input: Argon2Parameters,
  backing?: { readonly buffer: ArrayBuffer; readonly byteOffset: number }
): State => {
  const blocks = 4 * input.parallelism * Math.floor(input.memoryKiB / (4 * input.parallelism))
  const laneLength = blocks / input.parallelism
  let offset = backing?.byteOffset ?? 0

  const words = (length: number) => {
    if (backing === undefined) return new Uint32Array(length)
    const view = new Uint32Array(backing.buffer, offset, length)

    offset += view.byteLength

    return view
  }

  return {
    memory: words(blocks * 256),
    scratch: words(256),
    address: words(3 * 256),
    initial: words(18),
    final: words(256),
    blocks,
    laneLength,
    segmentLength: laneLength / 4
  }
}

/** @internal */
export const destroy = (state: State): void => {
  state.memory.fill(0)
  state.scratch.fill(0)
  state.address.fill(0)
  state.initial.fill(0)
  state.final.fill(0)
}

/** @internal */
export const initialize = (state: State, input: Argon2Parameters): void => {
  const h = new Blake2b()
  const scalar = new Uint8Array(4)
  const view = new DataView(scalar.buffer)

  const number = (value: number) => {
    view.setUint32(0, value, true)
    h.update(scalar)
  }

  try {
    for (const value of [input.parallelism, input.length, input.memoryKiB, input.passes, 19, 2]) {
      number(value)
    }
    for (
      const data of [
        input.password,
        input.salt,
        input.secret ?? new Uint8Array(),
        input.associatedData
      ]
    ) {
      number(data.length)
      h.update(data)
    }
    const initial = h.digest()

    try {
      const hashView = new DataView(initial.buffer, initial.byteOffset, initial.byteLength)

      for (let i = 0; i < 16; i++) state.initial[i] = hashView.getUint32(i * 4, true)
    } finally {
      initial.fill(0)
    }
    for (let lane = 0; lane < input.parallelism; lane++) {
      state.initial[17] = lane
      for (let first = 0; first < 2; first++) {
        state.initial[16] = first
        const expanded = variableHash(state.initial, 1024)

        try {
          const expandedView = new DataView(
            expanded.buffer,
            expanded.byteOffset,
            expanded.byteLength
          )

          const offset = (lane * state.laneLength + first) * 256

          for (let i = 0; i < 256; i++) {
            state.memory[offset + i] = expandedView.getUint32(i * 4, true)
          }
        } finally {
          expanded.fill(0)
        }
      }
    }
  } finally {
    h.destroy()
    scalar.fill(0)
    state.initial.fill(0)
  }
}

/**
 * Yields bounded block batches to the Effect driver; scratch belongs to this derivation.
 *
 * @internal
 */
export function* fill(
  state: State,
  input: Argon2Parameters,
  compress: typeof block = block
): Generator<void, void> {
  const { memory: B, scratch, address, laneLength: laneLen, segmentLength: segmentLen } = state
  const p = input.parallelism
  let processed = 0

  address[256 + 6] = state.blocks
  address[256 + 8] = input.passes
  address[256 + 10] = 2
  for (let r = 0; r < input.passes; r++) {
    const needXor = r !== 0

    address[256] = r
    for (let s = 0; s < ARGON2_SYNC_POINTS; s++) {
      address[256 + 4] = s
      const dataIndependent = r === 0 && s < 2

      for (let lane = 0; lane < p; lane++) {
        address[256 + 2] = lane
        address[256 + 12] = 0
        const start = r === 0 && s === 0 ? 2 : 0

        if (start === 2 && dataIndependent) {
          address[256 + 12]++
          compress(scratch, address, 256, 512, 0, false)
          compress(scratch, address, 0, 512, 0, false)
        }
        let offset = lane * laneLen + s * segmentLen + start

        for (let index = start; index < segmentLen; index++, offset++) {
          const prev = offset % laneLen ? offset - 1 : offset + laneLen - 1
          let randL: number
          let randH: number

          if (dataIndependent) {
            const addressIndex = index % 128

            if (addressIndex === 0) {
              address[256 + 12]++
              compress(scratch, address, 256, 512, 0, false)
              compress(scratch, address, 0, 512, 0, false)
            }
            randL = address[2 * addressIndex]
            randH = address[2 * addressIndex + 1]
          } else {
            randL = B[256 * prev]
            randH = B[256 * prev + 1]
          }
          const refLane = r === 0 && s === 0 ? lane : randH % p
          const refPos = indexAlpha(r, s, laneLen, segmentLen, index, randL, refLane === lane)

          compress(
            scratch,
            B,
            256 * prev,
            256 * (laneLen * refLane + refPos),
            offset * 256,
            needXor
          )
          if (++processed === BLOCKS_PER_BATCH) {
            processed = 0
            yield
          }
        }
      }
    }
  }
}

/** @internal */
export const output = (state: State, input: Argon2Parameters): Uint8Array => {
  for (let lane = 0; lane < input.parallelism; lane++) {
    const offset = 256 * (state.laneLength * lane + state.laneLength - 1)

    for (let word = 0; word < 256; word++) state.final[word] ^= state.memory[offset + word]
  }

  return variableHash(state.final, input.length)
}
