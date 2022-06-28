/**
 * Makes a scope. Finalizers added to this scope will be run sequentially in
 * the reverse of the order in which they were added when this scope is
 * closed.
 *
 * @tsplus static effect/core/io/Scope.Ops make
 */
export const make: Effect<never, never, Scope.Closeable> = Scope.makeWith(ExecutionStrategy.Sequential)
