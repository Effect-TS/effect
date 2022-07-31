/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus static effect/core/io/Effect.Aspects zip
 * @tsplus pipeable effect/core/io/Effect zip
 */
export function zip<R2, E2, A2>(
  that: LazyArg<Effect<R2, E2, A2>>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, Tuple<[A, A2]>> =>
    self.flatMap((a) => that().map((b) => Tuple(a, b)))
}
