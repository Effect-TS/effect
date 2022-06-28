import type { MergeTuple } from "@tsplus/stdlib/data/Tuple"

/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus static effect/core/io/Effect.Aspects zipFlatten
 * @tsplus pipeable effect/core/io/Effect zipFlatten
 */
export function zipFlatten<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, MergeTuple<A, A2>> =>
    self.zipWith(that, Tuple.mergeTuple)
}

// TODO(Mike/Max): remove once https://github.com/ts-plus/typescript/issues/201 is resolved
/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus operator effect/core/io/Effect +
 */
export function zipFlattenOp<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  that: LazyArg<Effect<R2, E2, A2>>,
  __tsplusTrace?: string
): Effect<R | R2, E | E2, MergeTuple<A, A2>> {
  return self.zipWith(that, Tuple.mergeTuple)
}
