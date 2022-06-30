/**
 * Makes a scope. Finalizers added to this scope will be run in parallel when
 * this scope is closed.
 *
 * @tsplus static effect/core/io/Scope.Ops parallel
 */
export function parallel(__tsplusTrace?: string): Effect<never, never, Scope.Closeable> {
  return Scope.makeWith(ExecutionStrategy.Parallel)
}
