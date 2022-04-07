/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream.
 *
 * @tsplus fluent ets/Stream runFoldScopedEffect
 */
export function runFoldScopedEffect_<R, E, A, R2, E2, S>(
  self: Stream<R, E, A>,
  s: LazyArg<S>,
  f: (s: S, a: A) => Effect<R2, E2, S>,
  __tsplusTrace?: string
): Effect<R & R2 & Has<Scope>, E | E2, S> {
  return self.runFoldWhileScopedEffect(s, () => true, f);
}

/**
 * Executes an effectful fold over the stream of values. Returns a scoped
 * value that represents the scope of the stream.
 *
 * @tsplus static ets/Stream/Aspects runFoldScopedEffect
 */
export const runFoldScopedEffect = Pipeable(runFoldScopedEffect_);
