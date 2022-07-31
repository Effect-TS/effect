/**
 * Drops all elements of the stream for as long as the specified predicate
 * produces an effect that evalutates to `true`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects dropWhileEffect
 * @tsplus pipeable effect/core/stream/Stream dropWhileEffect
 */
export function dropWhileEffect<A, R2, E2>(
  f: (a: A) => Effect<R2, E2, boolean>
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> =>
    self.pipeThrough(Sink.dropWhileEffect(f))
}
