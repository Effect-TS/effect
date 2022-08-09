import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus static effect/core/io/Effect.Aspects zipFlatten
 * @tsplus pipeable effect/core/io/Effect zipFlatten
 * @tsplus pipeable-operator effect/core/io/Effect +
 */
export function zipFlatten<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, MergeTuple<A, A2>> =>
    self.zipWith(that, Tuple.mergeTuple)
}
