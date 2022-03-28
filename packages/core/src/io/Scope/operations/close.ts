import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../../Effect"
import type { Exit } from "../../Exit"
import type { CloseableScope } from "../definition"
import { concreteCloseableScope } from "../definition"

/**
 * Closes a scope with the specified exit value, running all finalizers that
 * have been added to the scope.
 *
 * @tsplus fluent ets/Scope/Closeable close
 */
export function close_(
  self: CloseableScope,
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
