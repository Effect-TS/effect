/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream.
 *
 * @tsplus fluent ets/Stream runFoldScoped
 */
export function runFoldScoped_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
): Effect<R & Has<Scope>, E, S> {
  return self.runFoldWhileScoped(s, () => true, f);
}

/**
 * Executes a pure fold over the stream of values. Returns a scoped value
 * that represents the scope of the stream.
 *
 * @tsplus static ets/Stream/Aspects runFoldScoped
 */
export const runFoldScoped = Pipeable(runFoldScoped_);
