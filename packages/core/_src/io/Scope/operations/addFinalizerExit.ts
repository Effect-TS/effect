import { concreteScope } from "@effect/core/io/Scope/operations/_internal/ScopeInternal";

/**
 * A simplified version of `addFinalizerWith` when the `finalizer` does not
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus fluent ets/Scope addFinalizerExit
 * @tsplus fluent ets/Scope/Closeable addFinalizerExit
 */
export function addFinalizerExit_(self: Scope, finalizer: Scope.Finalizer): Effect.UIO<void> {
  concreteScope(self);
  return self._addFinalizerExit(finalizer);
}

/**
 * A simplified version of `addFinalizerWith` when the `finalizer` does not
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus static ets/Scope/Aspects addFinalizerExit
 */
export const addFinalizerExit = Pipeable(addFinalizerExit_);
