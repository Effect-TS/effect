import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import type { Scope } from "../definition"

/**
 * Adds a finalizer to this scope. The finalizer is guaranteed to be run when
 * the scope is closed.
 *
 * @tsplus fluent ets/Scope addFinalizer
 * @tsplus fluent ets/Scope/Closeable addFinalizer
 */
export function addFinalizer_(
  self: Scope,
  finalizer: LazyArg<UIO<unknown>>
): UIO<void> {
  return self.addFinalizerExit(() => finalizer())
}

/**
 * Adds a finalizer to this scope. The finalizer is guaranteed to be run when
 * the scope is closed.
 */
export const addFinalizer = Pipeable(addFinalizer_)
