/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus static effect/core/io/Effect.Aspects zipFlattenPar
 * @tsplus pipeable effect/core/io/Effect zipFlattenPar
 * @category zipping
 * @since 1.0.0
 */
export function zipFlattenPar<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A extends ReadonlyArray<any>>(
    self: Effect<R, E, A>
  ): Effect<R | R2, E | E2, readonly [...A, A2]> => self.zipWithPar(that, (a, a2) => [...a, a2])
}
