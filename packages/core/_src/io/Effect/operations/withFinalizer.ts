/**
 * Treats this effect as the acquisition of a resource and adds the
 * specified finalizer to the current scope. This effect will be run
 * uninterruptibly and the finalizer will be run when the scope is closed.
 *
 * @tsplus fluent ets/Effect withFinalizer
 */
export function withFinalizer_<R, R2, E, A, X>(
  self: Effect<R, E, A>,
  finalizer: LazyArg<Effect<R2, never, X>>,
  __tsplusTrace?: string
): Effect<R | R2 | Scope, E, A> {
  return self.withFinalizerExit(finalizer)
}

/**
 * Treats this effect as the acquisition of a resource and adds the
 * specified finalizer to the current scope. This effect will be run
 * uninterruptibly and the finalizer will be run when the scope is closed.
 *
 * @tsplus static ets/Effect/Aspects withFinalizer
 */
export const withFinalizer = Pipeable(withFinalizer_)
