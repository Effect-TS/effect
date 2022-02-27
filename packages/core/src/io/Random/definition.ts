/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */

import type { Has } from "../../data/Has"
import { tag } from "../../data/Has"
import type { RIO, UIO } from "../Effect"
import { Effect } from "../Effect"
import { PCGRandom } from "./_internal/PCG"

export const RandomId: unique symbol = Symbol.for("@effect-ts/core/Random")
export type RandomId = typeof RandomId

/**
 * @tsplus type ets/Random
 */
export interface Random {
  readonly next: UIO<number>
  readonly nextBoolean: UIO<boolean>
  readonly nextInt: UIO<number>
  readonly nextRange: (low: number, high: number) => UIO<number>
  readonly nextIntBetween: (low: number, high: number) => UIO<number>
}

/**
 * @tsplus type ets/RandomOps
 */
export interface RandomOps {}
export const Random: RandomOps = {}

/**
 * @tsplus static ets/RandomOps make
 */
export function make(seed: number): Random {
  const PRNG = new PCGRandom(seed)

  const next: UIO<number> = Effect.succeed(() => PRNG.number())

  const nextBoolean: UIO<boolean> = next.flatMap((n) => Effect.succeed(n > 0.5))

  const nextInt: UIO<number> = Effect.succeed(() => PRNG.integer(0))

  function nextRange(low: number, high: number): UIO<number> {
    return next.flatMap((n) => Effect.succeed((high - low) * n + low))
  }

  function nextIntBetween(low: number, high: number): UIO<number> {
    return Effect.succeed(() => PRNG.integer(1 + high - low) + low)
  }

  return {
    next,
    nextBoolean,
    nextInt,
    nextRange,
    nextIntBetween
  }
}

/**
 * @tsplus static ets/RandomOps default
 */
export const defaultRandom = make((Math.random() * 4294967296) >>> 0)

export const HasRandom = tag<Random>(RandomId)

export type HasRandom = Has<Random>

/**
 * @tsplus static ets/RandomOps next
 */
export const next: RIO<HasRandom, number> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.next
)

/**
 * @tsplus static ets/RandomOps nextInt
 */
export const nextInt: RIO<HasRandom, number> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.nextInt
)

/**
 * @tsplus static ets/RandomOps nextBoolean
 */
export const nextBoolean: RIO<HasRandom, boolean> = Effect.serviceWithEffect(HasRandom)(
  (_) => _.nextBoolean
)

/**
 * @tsplus static ets/RandomOps nextIntBetween
 */
export function nextIntBetween(low: number, high: number): RIO<HasRandom, number> {
  return Effect.serviceWithEffect(HasRandom)((_) => _.nextIntBetween(low, high))
}

/**
 * @tsplus static ets/RandomOps nextRange
 */
export function nextRange(low: number, high: number): RIO<HasRandom, number> {
  return Effect.serviceWithEffect(HasRandom)((_) => _.nextRange(low, high))
}

/**
 * @tsplus static ets/RandomOps withSeed
 */
export function withSeed(seed: number) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & HasRandom, E, A> =>
    self.updateService(HasRandom)(() => make(seed))
}
