/**
 * A more powerful variant of `acquireRelease` that allows the `release`
 * workflow to depend on the `Exit` value specified when the scope is closed.
 *
 * @tsplus static effect/core/io/Effect.Ops acquireReleaseExit
 * @tsplus fluent effect/core/io/Effect acquireReleaseExit
 */
export function acquireReleaseExit<R, E, A, R2, X>(
  acquire: LazyArg<Effect<R, E, A>>,
  release: (a: A, exit: Exit<unknown, unknown>) => Effect<R2, never, X>,
  __tsplusTrace?: string
): Effect<R | R2 | Scope, E, A> {
  return Effect.suspendSucceed(acquire)
    .tap((a) => Effect.addFinalizerExit((exit) => release(a, exit)))
    .uninterruptible
}
