/**
 * Returns the specified stream if the specified effectful condition is
 * satisfied, otherwise returns an empty stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops whenEffect
 * @category mutations
 * @since 1.0.0
 */
export function whenEffect<R, E, R1, E1, A>(
  b: Effect<R, E, boolean>,
  stream: Stream<R1, E1, A>
): Stream<R | R1, E | E1, A> {
  return Stream.fromEffect(b).flatMap((b) => (b ? stream : Stream.empty))
}
