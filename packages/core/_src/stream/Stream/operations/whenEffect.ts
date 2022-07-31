/**
 * Returns the specified stream if the specified effectful condition is
 * satisfied, otherwise returns an empty stream.
 *
 * @tsplus static effect/core/stream/Stream.Ops whenEffect
 */
export function whenEffect<R, E, R1, E1, A>(
  b: LazyArg<Effect<R, E, boolean>>,
  stream: LazyArg<Stream<R1, E1, A>>
): Stream<R | R1, E | E1, A> {
  return Stream.fromEffect(b()).flatMap((b) => (b ? stream() : Stream.empty))
}
