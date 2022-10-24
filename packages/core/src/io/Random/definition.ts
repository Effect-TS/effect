import type { Chunk } from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"

/**
 * @category symbol
 * @since 1.0.0
 */
export const RandomSym = Symbol.for("@effect/core/io/Random")

/**
 * @category symbol
 * @since 1.0.0
 */
export type RandomSym = typeof RandomSym

/**
 * @tsplus type effect/core/io/Random
 * @category model
 * @since 1.0.0
 */
export interface Random {
  readonly [RandomSym]: RandomSym
  readonly next: Effect<never, never, number>
  readonly nextBoolean: Effect<never, never, boolean>
  readonly nextInt: Effect<never, never, number>
  readonly nextRange: (low: number, high: number) => Effect<never, never, number>
  readonly nextIntBetween: (low: number, high: number) => Effect<never, never, number>
  readonly shuffle: <A>(collection: Iterable<A>) => Effect<never, never, Chunk<A>>
}

/**
 * @tsplus type effect/core/io/Random.Ops
 * @category model
 * @since 1.0.0
 */
export interface RandomOps {
  $: RandomAspects
  Tag: Context.Tag<Random>
}
export const Random: RandomOps = {
  $: {},
  Tag: Context.Tag()
}

/**
 * @tsplus type effect/core/io/Random.Aspects
 * @category model
 * @since 1.0.0
 */
export interface RandomAspects {}
