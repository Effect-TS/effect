/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream. Stops the fold early when the
 * condition is not fulfilled.
 *
 * @param cont A function which defines the early termination condition.
 *
 * @tsplus fluent ets/Stream runFoldWhileScoped
 */
export function runFoldWhileScoped_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  cont: Predicate<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, E, S> {
  return self.runScoped(Sink.fold(s, cont, f));
}

/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream. Stops the fold early when the
 * condition is not fulfilled.
 *
 * @param cont A function which defines the early termination condition.
 *
 * @tsplus static ets/Stream/Aspects runFoldWhileScoped
 */
export const runFoldWhileScoped = Pipeable(runFoldWhileScoped_);
