/**
 * Maps the success values of this stream to the specified constant value.
 *
 * @tsplus static effect/core/stream/Stream.Aspects as
 * @tsplus pipeable effect/core/stream/Stream as
 */
export function as<A2>(a: LazyArg<A2>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A2> => self.map(a)
}
