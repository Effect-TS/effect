/**
 * Sequentially zips this effect with the specified effect using the
 * specified combiner function.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipWith
 * @tsplus pipeable effect/core/io/Effect zipWith
 */
export function zipWith<R2, E2, A2, A, B>(
  that: Effect<R2, E2, A2>,
  f: (a: A, b: A2) => B
) {
  return <R, E>(self: Effect<R, E, A>): Effect<R | R2, E | E2, B> =>
    self.flatMap((a) => that.map((b) => f(a, b)))
}
