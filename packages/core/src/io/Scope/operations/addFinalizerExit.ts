import type { UIO } from "../../Effect"
import type { Finalizer, Scope } from "../definition"
import { concreteScope } from "./_internal/ScopeInternal"

/**
 * A simplified version of `addFinalizerWith` when the `finalizer` does not
 * depend on the `Exit` value that the scope is closed with.
 *
 * @tsplus fluent ets/Scope addFinalizerExit
 * @tsplus fluent ets/Scope/Closeable addFinalizerExit
 */
export function addFinalizerExit_(self: Scope, finalizer: Finalizer): UIO<void> {
  concreteScope(self)
  return self._addFinalizerExit(finalizer)
}

/**
 * A simplified version of `addFinalizerWith` when the `finalizer` does not
 * depend on the `Exit` value that the scope is closed with.
 */
export const addFinalizerExit = Pipeable(addFinalizerExit_)
