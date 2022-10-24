/**
 * Adds an effect to consumption of every element of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects tap
 * @tsplus pipeable effect/core/stream/Stream tap
 * @category sequencing
 * @since 1.0.0
 */
export function tap<A, R2, E2, Z>(
  f: (a: A) => Effect<R2, E2, Z>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    self.mapEffect((a) => f(a).as(a))
}
