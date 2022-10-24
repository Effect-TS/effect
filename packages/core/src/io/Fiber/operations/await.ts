import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * Awaits the fiber, which suspends the awaiting fiber until the result of the
 * fiber has been determined.
 *
 * @tsplus getter effect/core/io/Fiber await
 * @tsplus getter effect/core/io/RuntimeFiber await
 * @category destructors
 * @since 1.0.0
 */
export function _await<E, A>(
  self: Fiber<E, A>
): Effect<never, never, Exit<E, A>> {
  realFiber(self)
  return self.await
}

export { _await as await }
