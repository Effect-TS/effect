import { concreteScope } from "@effect/core/io/Scope/operations/_internal/ScopeInternal"

/**
 * A simplified version of `addFinalizerWith` when the `finalizer` does not
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static effect/core/io/Scope.Aspects addFinalizerExit
 * @tsplus pipeable effect/core/io/Scope addFinalizerExit
 * @tsplus pipeable effect/core/io/Scope/Closeable addFinalizerExit
 */
export function addFinalizerExit(finalizer: Scope.Finalizer) {
  return (self: Scope): Effect<never, never, void> => {
    concreteScope(self)
    return self._addFinalizerExit(finalizer)
  }
}
