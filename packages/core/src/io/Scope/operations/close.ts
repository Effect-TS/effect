import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import type { Exit } from "../../Exit"
import type { Scope } from "../definition"
import { concreteCloseableScope } from "./_internal/CloseableScopeInternal"

/**
 * Closes a scope with the specified exit value, running all finalizers that
 * have been added to the scope.
 *
 * @tsplus fluent ets/Scope/Closeable close
 */
export function close_(
  self: Scope.Closeable,
  exit: LazyArg<Exit<unknown, unknown>>
): UIO<void> {
  concreteCloseableScope(self)
  return self._close(exit)
}

/**
 * Closes a scope with the specified exit value, running all finalizers that
 * have been added to the scope.
 */
export const close = Pipeable(close_)
