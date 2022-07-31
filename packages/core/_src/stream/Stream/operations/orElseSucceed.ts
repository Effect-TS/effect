/**
 * Succeeds with the specified value if this one fails with a typed error.
 *
 * @tsplus static effect/core/stream/Stream.Aspects orElseSucceed
 * @tsplus pipeable effect/core/stream/Stream orElseSucceed
 */
export function orElseSucceed<A2>(a: LazyArg<A2>) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, never, A | A2> => self | Stream.succeed(a)
}
