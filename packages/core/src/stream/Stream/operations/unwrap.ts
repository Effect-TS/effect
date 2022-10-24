/**
 * Creates a stream produced from an `Effect`.
 *
 * @tsplus static effect/core/stream/Stream.Ops unwrap
 * @category constructors
 * @since 1.0.0
 */
export function unwrap<R, E, R1, E1, A>(
  effect: Effect<R, E, Stream<R1, E1, A>>
): Stream<R | R1, E | E1, A> {
  return Stream.fromEffect(effect).flatten
}
