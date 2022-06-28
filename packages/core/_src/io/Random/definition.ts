export const RandomSym = Symbol.for("@effect/core/io/Random")
export type RandomSym = typeof RandomSym

/**
 * @tsplus type effect/core/io/Random
 */
export interface Random {
  readonly [RandomSym]: RandomSym
  readonly next: Effect<never, never, number>
  readonly nextBoolean: Effect<never, never, boolean>
  readonly nextInt: Effect<never, never, number>
  readonly nextRange: (low: number, high: number, __tsplusTrace?: string) => Effect<never, never, number>
  readonly nextIntBetween: (low: number, high: number, __tsplusTrace?: string) => Effect<never, never, number>
  readonly shuffle: <A>(
    collection: LazyArg<Collection<A>>,
    __tsplusTrace?: string
  ) => Effect<never, never, Collection<A>>
}

/**
 * @tsplus type effect/core/io/Random.Ops
 */
export interface RandomOps {
  $: RandomAspects
  Tag: Tag<Random>
}
export const Random: RandomOps = {
  $: {},
  Tag: Service.Tag()
}

/**
 * @tsplus type effect/core/io/Random.Aspects
 */
export interface RandomAspects {}
