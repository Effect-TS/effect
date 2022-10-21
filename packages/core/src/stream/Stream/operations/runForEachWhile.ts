/**
 * Consumes elements of the stream, passing them to the specified callback,
 * and terminating consumption when the callback returns `false`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runForEachWhile
 * @tsplus pipeable effect/core/stream/Stream runForEachWhile
 */
export function runForEachWhile<A, R2, E2, Z>(
  f: (a: A) => Effect<R2, E2, boolean>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2, E | E2, void> =>
    self.run(
      Sink.forEachWhile(f)
    )
}
