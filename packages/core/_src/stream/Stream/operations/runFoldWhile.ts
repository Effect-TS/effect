/**
 * Reduces the elements in the stream to a value of type `S`. Stops the fold
 * early when the condition is not fulfilled.
 *
 * @tsplus fluent ets/Stream runFoldWhile
 */
export function runFoldWhile_<R, E, A, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  cont: Predicate<S>,
  f: (s: S, a: A) => S,
  __tsplusTrace?: string
): Effect<R, E, S> {
  return Effect.scoped(self.runFoldWhileScoped(s, cont, f));
}

/**
 * Reduces the elements in the stream to a value of type `S`. Stops the fold
 * early when the condition is not fulfilled.
 *
 * @tsplus static ets/Stream/Aspects runFoldWhile
 */
export const runFoldWhile = Pipeable(runFoldWhile_);
