import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * Inherits values from all `FiberRef` instances into current fiber. This
 * will resume immediately.
 *
 * @tsplus getter effect/core/io/Fiber inheritAll
 * @tsplus getter effect/core/io/RuntimeFiber inheritAll
 */
export function inheritAll<E, A>(
  self: Fiber<E, A>
): Effect<never, never, void> {
  realFiber(self)
  return self.inheritAll
}
