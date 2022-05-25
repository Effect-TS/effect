/**
 * Adds a finalizer to this scope. The finalizer is guaranteed to be run when
 * the scope is closed.
 *
 * @tsplus fluent ets/Scope addFinalizer
 * @tsplus fluent ets/Scope/Closeable addFinalizer
 */
export function addFinalizer_(
  self: Scope,
  finalizer: LazyArg<Effect.UIO<unknown>>
): Effect.UIO<void> {
  return self.addFinalizerExit(() => finalizer())
}

/**
 * Adds a finalizer to this scope. The finalizer is guaranteed to be run when
 * the scope is closed.
 *
 * @tsplus static ets/Scope/Aspects addFinalizer
 */
export const addFinalizer = Pipeable(addFinalizer_)
