/**
 * Like `Stream.runForEachWhile`, but returns a scoped `Effect` so the
 * finalization order can be controlled.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runForEachWhileScoped
 * @tsplus pipeable effect/core/stream/Stream runForEachWhileScoped
 */
export function runForEachWhileScoped<A, R2, E2, Z>(
  f: (a: A) => Effect<R2, E2, boolean>
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R2 | Scope, E | E2, void> =>
    self.runScoped(
      Sink.forEachWhile(f)
    )
}
