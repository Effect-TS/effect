/**
 * Sequentially zips this effect with the specified effect
 *
 * @tsplus pipeable-operator effect/core/io/Effect +
 * @tsplus static effect/core/io/Effect.Aspects zip
 * @tsplus pipeable effect/core/io/Effect zip
 * @category zipping
 * @since 1.0.0
 */
export function zip<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, readonly [A, A2]> =>
    self.flatMap((a) => that.map((b) => [a, b] as const))
}
