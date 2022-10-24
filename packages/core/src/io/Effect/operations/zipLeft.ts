/**
 * Sequences the specified effect after this effect, but ignores the value
 * produced by the effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects zipLeft
 * @tsplus pipeable effect/core/io/Effect zipLeft
 * @tsplus pipeable-operator effect/core/io/Effect <
 * @category zipping
 * @since 1.0.0
 */
export function zipLeft<R2, E2, A2>(that: Effect<R2, E2, A2>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E | E2, A> =>
    self.flatMap((a) => that.as(a))
}
