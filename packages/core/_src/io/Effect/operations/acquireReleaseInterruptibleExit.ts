/**
 * A more powerful variant of `acquireReleaseInterruptible` that allows the
 * `release` effect to depend on the `Exit` value specified when the scope
 * is closed.
 *
 * @tsplus static ets/Effect/Ops acquireReleaseInterruptibleExit
 * @tsplus fluent ets/Effect acquireReleaseInterruptibleExit
 */
export function acquireReleaseInterruptibleExit<R, E, A, R2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (exit: Exit<unknown, unknown>) => Effect<R2, never, X>,
  __tsplusTrace?: string
): Effect<R | R2 | Scope, E, A> {
  return Effect.suspendSucceed(acquire().ensuring(Effect.addFinalizerExit(release)))
}
