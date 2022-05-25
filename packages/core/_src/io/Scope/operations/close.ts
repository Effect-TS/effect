import { concreteCloseableScope } from "@effect/core/io/Scope/operations/_internal/CloseableScopeInternal"

/**
 * Closes a scope with the specified exit value, running all finalizers that
 * have been added to the scope.
 *
 * @tsplus fluent ets/Scope/Closeable close
 */
export function close_(
  self: Scope.Closeable,
  exit: LazyArg<Exit<unknown, unknown>>
): Effect.UIO<void> {
  concreteCloseableScope(self)
  return self._close(exit)
}

/**
 * Closes a scope with the specified exit value, running all finalizers that
 * have been added to the scope.
 *
 * @tsplus static ets/Scope/Aspects close
 */
export const close = Pipeable(close_)
