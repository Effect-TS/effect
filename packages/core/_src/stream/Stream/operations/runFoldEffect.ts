/**
 * Executes a pure fold over the stream of values - reduces all elements in
 * the stream to a value of type `S`.
 *
 * @tsplus fluent ets/Stream runFoldEffect
 */
export function runFoldEffect_<R, E, A, R2, E2, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>,
  __tsplusTrace?: string
): Effect<R & R2, E | E2, S> {
  return Effect.scoped(self.runFoldWhileScopedEffect(s, () => true, f));
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in
 * the stream to a value of type `S`.
 *
 * @tsplus static ets/Stream/Aspects runFoldEffect
 */
export const runFoldEffect = Pipeable(runFoldEffect_);
