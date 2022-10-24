/**
 * Makes a scope. Finalizers added to this scope will be run in parallel when
 * this scope is closed.
 *
 * @tsplus static effect/core/io/Scope.Ops parallel
 * @category constructors
 * @since 1.0.0
 */
export function parallel(): Effect<never, never, Scope.Closeable> {
  return Scope.makeWith(ExecutionStrategy.Parallel)
}
