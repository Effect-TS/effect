/**
 * Like `Stream.runForEachWhile`, but returns a scoped `Effect` so the
 * finalization order can be controlled.
 *
 * @tsplus fluent ets/Stream runForEachWhileScoped
 */
export function runForEachWhileScoped_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  f: (a: A) => Effect<R2, E2, boolean>,
  __tsplusTrace?: string
): Effect<R & R2 & Has<Scope>, E | E2, void> {
  return self.runScoped(Sink.forEachWhile(f));
}

/**
 * Like `Stream.runForEachWhile`, but returns a scoped `Effect` so the
 * finalization order can be controlled.
 *
 * @tsplus static ets/Stream/Aspects runForEachWhileScoped
 */
export const runForEachWhileScoped = Pipeable(runForEachWhileScoped_);
