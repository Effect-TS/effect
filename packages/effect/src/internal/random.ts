import * as Context from "../Context.ts"

/** @internal */
export interface Random {
  nextIntUnsafe(): number
  nextDoubleUnsafe(): number
}

/** @internal */
export interface SeedHash {
  readonly first: number
  readonly second: number
}

/** @internal */
export interface SeededRandom extends Random {
  readonly nextUint32: () => number
  readonly clone: () => SeededRandom
  readonly copyFrom: (source: { readonly snapshot: () => readonly [number, number, number, number] }) => void
  readonly snapshot: () => readonly [number, number, number, number]
}

/** @internal */
export const Random: Context.Reference<Random> = Context.Reference<Random>("effect/Random", {
  defaultValue: () => ({
    nextIntUnsafe() {
      return Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER + 1)) +
        Number.MIN_SAFE_INTEGER
    },
    nextDoubleUnsafe() {
      return Math.random()
    }
  })
})

function mix32(value: number): number {
  // MurmurHash3 fmix32 by Austin Appleby, dedicated to the public domain.
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b)
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35)
  return (value ^ value >>> 16) >>> 0
}

/** @internal */
export function hashSeed(seed: string | number): SeedHash {
  const value = `${typeof seed}:${seed}`
  let first = 0x811c9dc5
  let second = 0x9e3779b9
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    first = Math.imul(first ^ code, 0x01000193)
    second = Math.imul(second ^ code ^ index, 0x85ebca6b)
  }
  return {
    first: mix32(first),
    second: mix32(second ^ value.length)
  }
}

function rotateLeft(value: number, shift: number): number {
  return (value << shift | value >>> (32 - shift)) >>> 0
}

function makeSeededRandom(
  initialState0: number,
  initialState1: number,
  initialState2: number,
  initialState3: number
): SeededRandom {
  let state0 = initialState0
  let state1 = initialState1
  let state2 = initialState2
  let state3 = initialState3
  // xoshiro128** 1.1 by David Blackman and Sebastiano Vigna, dedicated to the public domain.
  // It is intended for reproducible sampling, not cryptographic use.
  // https://prng.di.unimi.it/xoshiro128starstar.c
  const nextUint32 = () => {
    const result = Math.imul(rotateLeft(Math.imul(state1, 5), 7), 9) >>> 0
    const temporary = state1 << 9
    state2 ^= state0
    state3 ^= state1
    state1 ^= state2
    state0 ^= state3
    state2 ^= temporary
    state3 = rotateLeft(state3, 11)
    return result
  }
  const nextDoubleUnsafe = () => {
    const high = nextUint32() >>> 5
    const low = nextUint32() >>> 6
    return (high * 0x4000000 + low) / 0x20000000000000
  }
  const nextIntUnsafe = () =>
    Math.floor(nextDoubleUnsafe() * (Number.MAX_SAFE_INTEGER - Number.MIN_SAFE_INTEGER + 1)) +
    Number.MIN_SAFE_INTEGER
  return {
    nextUint32,
    nextDoubleUnsafe,
    nextIntUnsafe,
    clone: () => makeSeededRandom(state0, state1, state2, state3),
    copyFrom: (source) => {
      const snapshot = source.snapshot()
      state0 = snapshot[0]
      state1 = snapshot[1]
      state2 = snapshot[2]
      state3 = snapshot[3]
    },
    snapshot: () => [state0, state1, state2, state3]
  }
}

/** @internal */
export function makeSeededFromHash(seed: SeedHash, stream: number): SeededRandom {
  const streamLow = stream >>> 0
  const streamHigh = Math.floor(stream / 0x100000000) >>> 0
  let state0 = mix32(seed.first ^ streamLow ^ Math.imul(streamHigh, 0x9e3779b9))
  const state1 = mix32(seed.second ^ streamHigh ^ Math.imul(streamLow, 0x85ebca6b))
  const state2 = mix32(seed.first ^ streamHigh ^ Math.imul(streamLow, 0xc2b2ae35) ^ 0x243f6a88)
  const state3 = mix32(seed.second ^ streamLow ^ Math.imul(streamHigh, 0x27d4eb2f) ^ 0xb7e15162)
  if ((state0 | state1 | state2 | state3) === 0) state0 = 0x9e3779b9
  return makeSeededRandom(state0, state1, state2, state3)
}

/** @internal */
export const makeSeeded = (seed: string | number): SeededRandom => makeSeededFromHash(hashSeed(seed), 0)
