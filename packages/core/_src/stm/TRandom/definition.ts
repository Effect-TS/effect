import type { PCGRandomState } from "@tsplus/stdlib/utilities/RandomPCG"

export const TRandomSym = Symbol.for("@effect/core/stm/TRandom")
export type TRandomSym = typeof TRandomSym

/**
 * @tsplus type effect/core/stm/TRandom
 */
export interface TRandom {
  readonly [TRandomSym]: TRandomSym
  readonly next: USTM<number>
  readonly nextBoolean: USTM<boolean>
  readonly nextInt: USTM<number>
  readonly nextRange: (low: number, high: number) => USTM<number>
  readonly nextIntBetween: (low: number, high: number) => USTM<number>
  readonly shuffle: <A>(collection: LazyArg<Collection<A>>) => USTM<Collection<A>>
  readonly withState: <A>(f: (state: PCGRandomState) => Tuple<[A, PCGRandomState]>) => USTM<A>
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
