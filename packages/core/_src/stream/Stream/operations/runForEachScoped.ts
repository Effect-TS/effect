/**
 * Like `Stream.forEach`, but returns an `Effect` so the finalization
 * order can be controlled.
 *
 * @tsplus static effect/core/stream/Stream.Aspects runForEachScoped
 * @tsplus pipeable effect/core/stream/Stream runForEachScoped
 */
export function runForEachScoped<A, R1, E1, Z>(
  f: (a: A) => Effect<R1, E1, Z>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Stream<R, E, A>): Effect<R | R1 | Scope, E | E1, void> => self.runScoped(Sink.forEach(f))
}
