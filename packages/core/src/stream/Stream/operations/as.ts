/**
 * Maps the success values of this stream to the specified constant value.
 *
 * @tsplus static effect/core/stream/Stream.Aspects as
 * @tsplus pipeable effect/core/stream/Stream as
 * @category mapping
 * @since 1.0.0
 */
export function as<A2>(a: A2) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A2> => self.map(() => a)
}
