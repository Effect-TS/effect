import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * Awaits the fiber, which suspends the awaiting fiber until the result of the
 * fiber has been determined.
 *
 * @tsplus getter effect/core/io/Fiber await
 * @tsplus getter effect/core/io/RuntimeFiber await
 */
export function _await<E, A>(
  self: Fiber<E, A>
): Effect<never, never, Exit<E, A>> {
  realFiber(self)
  return self._await
}

export { _await as await }
