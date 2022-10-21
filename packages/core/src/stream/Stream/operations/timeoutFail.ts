/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus static effect/core/stream/Stream.Aspects timeoutFail
 * @tsplus pipeable effect/core/stream/Stream timeoutFail
 */
export function timeoutFail<E2>(e: LazyArg<E2>, duration: Duration) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E | E2, A> =>
    self.timeoutTo(duration, Stream.failSync(e))
}
