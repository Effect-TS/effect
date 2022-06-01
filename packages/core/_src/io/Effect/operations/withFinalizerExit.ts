/**
 * A more powerful variant of `withFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus fluent ets/Effect withFinalizerExit
 */
export function withFinalizerExit_<R, R2, E, A, X>(
  self: Effect<R, E, A>,
  finalizer: (exit: Exit<unknown, unknown>) => Effect.RIO<R2, X>,
  __tsplusTrace?: string
): Effect<R | R2 | Scope, E, A> {
  return Effect.acquireReleaseExit(self, (_, exit) => finalizer(exit))
}

/**
 * A more powerful variant of `withFinalizer` that allows the finalizer to
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static ets/Effect/Aspects withFinalizerExit
 */
export const withFinalizerExit = Pipeable(withFinalizerExit_)
