import type { Chunk } from "@fp-ts/data/Chunk"
import * as Context from "@fp-ts/data/Context"

/** @internal */
export type RandomState = [number, number, number, number]

/**
 * @category symbol
 * @since 1.0.0
 */
export const TRandomSym = Symbol.for("@effect/core/stm/TRandom")

/**
 * @category symbol
 * @since 1.0.0
 */
export type TRandomSym = typeof TRandomSym

/**
 * @tsplus type effect/core/stm/TRandom
 * @category model
 * @since 1.0.0
 */
export interface TRandom {
  readonly [TRandomSym]: TRandomSym
  readonly next: STM<never, never, number>
  readonly nextBoolean: STM<never, never, boolean>
  readonly nextInt: STM<never, never, number>
  readonly nextRange: (low: number, high: number) => STM<never, never, number>
  readonly nextIntBetween: (low: number, high: number) => STM<never, never, number>
  readonly shuffle: <A>(collection: Iterable<A>) => STM<never, never, Chunk<A>>
  readonly withState: <A>(
    f: (state: RandomState) => readonly [A, RandomState]
  ) => STM<never, never, A>
}

/**
 * @tsplus type effect/core/stm/TRandom.Ops
 * @category model
 * @since 1.0.0
 */
export interface TRandomOps {
  $: TRandomAspects
  Tag: Context.Tag<TRandom>
}
export const TRandom: TRandomOps = {
  $: {},
  Tag: Context.Tag()
}

/**
 * @tsplus type effect/core/stm/TRandom.Aspects
 * @category model
 * @since 1.0.0
 */
export interface TRandomAspects {}
