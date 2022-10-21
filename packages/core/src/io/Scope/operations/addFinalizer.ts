/**
 * Adds a finalizer to this scope. The finalizer is guaranteed to be run when
 * the scope is closed.
 *
 * @tsplus static effect/core/io/Scope.Aspects addFinalizer
 * @tsplus pipeable effect/core/io/Scope addFinalizer
 * @tsplus pipeable effect/core/io/Scope/Closeable addFinalizer
 */
export function addFinalizer(finalizer: Effect<never, never, unknown>) {
  return (self: Scope): Effect<never, never, void> => self.addFinalizerExit(() => finalizer)
}
