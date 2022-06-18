import { concreteScope } from "@effect/core/io/Scope/operations/_internal/ScopeInternal"

/**
 * Forks a new scope that is a child of this scope. The child scope will
 * automatically be closed when this scope is closed.
 *
 * @tsplus getter ets/Scope fork
 * @tsplus fluent ets/Scope/Closeable fork
 */
export function fork(self: Scope): Effect<never, never, Scope.Closeable> {
  concreteScope(self)
  return self._fork
}
