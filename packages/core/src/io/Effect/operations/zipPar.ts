/**
 * Zips this effect and that effect in parallel.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipPar
 * @tsplus pipeable effect/core/io/Effect zipPar
 * @tsplus pipeable-operator effect/core/io/Effect &
 * @category zipping
 * @since 1.0.0
 */
export function zipPar<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, readonly [A, A2]> =>
    self.zipWithPar(that, (a, b) => [a, b] as const)
}
