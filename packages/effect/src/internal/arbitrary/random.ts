import type * as Model from "./model.ts"

/** @internal */
export interface SeedState {
  readonly first: number
  readonly second: number
}

function mix32(value: number): number {
  // MurmurHash3 fmix32 by Austin Appleby, dedicated to the public domain.
  value ^= value >>> 16
  value = Math.imul(value, 0x85ebca6b)
  value ^= value >>> 13
  value = Math.imul(value, 0xc2b2ae35)
  return (value ^ value >>> 16) >>> 0
}

/** @internal */
export function hashSeed(seed: string | number): SeedState {
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

/** @internal */
export function makeGenerationRandom(
  initialState0: number,
  initialState1: number,
  initialState2: number,
  initialState3: number
): Model.GenerationRandom {
  let state0 = initialState0
  let state1 = initialState1
  let state2 = initialState2
  let state3 = initialState3
  // xoshiro128** 1.1 by David Blackman and Sebastiano Vigna, dedicated to the public domain.
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
  return {
    nextUint32,
    nextDoubleUnsafe,
    clone: () => makeGenerationRandom(state0, state1, state2, state3),
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
export function makeAttemptRandom(seed: SeedState, attempt: number): Model.GenerationRandom {
  // This provides the same per-run isolation targeted by fast-check v4.9.0's jump-before-toss strategy (MIT), while
  // deriving the attempt state directly so replay can jump to it without executing preceding attempts.
  // https://github.com/dubzzz/fast-check/blob/v4.9.0/packages/fast-check/src/check/runner/Tosser.ts
  const attemptLow = attempt >>> 0
  const attemptHigh = Math.floor(attempt / 0x100000000) >>> 0
  let state0 = mix32(seed.first ^ attemptLow ^ Math.imul(attemptHigh, 0x9e3779b9))
  const state1 = mix32(seed.second ^ attemptHigh ^ Math.imul(attemptLow, 0x85ebca6b))
  const state2 = mix32(seed.first ^ attemptHigh ^ Math.imul(attemptLow, 0xc2b2ae35) ^ 0x243f6a88)
  const state3 = mix32(seed.second ^ attemptLow ^ Math.imul(attemptHigh, 0x27d4eb2f) ^ 0xb7e15162)
  if ((state0 | state1 | state2 | state3) === 0) state0 = 0x9e3779b9
  return makeGenerationRandom(state0, state1, state2, state3)
}
