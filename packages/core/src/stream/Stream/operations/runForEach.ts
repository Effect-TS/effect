/**
 * Consumes all elements of the stream, passing them to the specified
 * callback.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runForEach
 * @tsplus pipeable effect/core/stream/Stream runForEach
 * @category destructors
 * @since 1.0.0
 */
export function runForEach<R, E, A, R2, E2, Z>(
  f: (a: A) => Effect<R2, E2, Z>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2, E | E2, void> =>
    self.run(
      Sink.forEach(f)
    )
}
