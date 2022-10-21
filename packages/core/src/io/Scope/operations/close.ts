import { concreteCloseableScope } from "@effect/core/io/Scope/operations/_internal/CloseableScopeInternal"

/**
 * Closes a scope with the specified exit value, running all finalizers that
 * have been added to the scope.
 *
 * @tsplus pipeable effect/core/io/Scope/Closeable close
 */
export function close(exit: Exit<unknown, unknown>) {
  return (self: Scope.Closeable): Effect<never, never, void> => {
    concreteCloseableScope(self)
    return self._close(exit)
  }
}
