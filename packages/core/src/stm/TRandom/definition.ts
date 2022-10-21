import type { PCGRandomState } from "@tsplus/stdlib/io/Random"

export const TRandomSym = Symbol.for("@effect/core/stm/TRandom")
export type TRandomSym = typeof TRandomSym

/**
 * @tsplus type effect/core/stm/TRandom
 */
export interface TRandom {
  readonly [TRandomSym]: TRandomSym
  readonly next: STM<never, never, number>
  readonly nextBoolean: STM<never, never, boolean>
  readonly nextInt: STM<never, never, number>
  readonly nextRange: (low: number, high: number) => STM<never, never, number>
  readonly nextIntBetween: (low: number, high: number) => STM<never, never, number>
  readonly shuffle: <A>(collection: Collection<A>) => STM<never, never, Collection<A>>
  readonly withState: <A>(
    f: (state: PCGRandomState) => readonly [A, PCGRandomState]
  ) => STM<never, never, A>
}

/**
 * @tsplus type effect/core/stm/TRandom.Ops
 */
export interface TRandomOps {
  $: TRandomAspects
  Tag: Tag<TRandom>
}
export const TRandom: TRandomOps = {
  $: {},
  Tag: Service.Tag()
}

/**
 * @tsplus type effect/core/stm/TRandom.Aspects
 */
export interface TRandomAspects {}
