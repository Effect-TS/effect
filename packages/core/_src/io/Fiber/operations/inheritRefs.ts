import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * Inherits values from all `FiberRef` instances into current fiber. This
 * will resume immediately.
 *
 * @tsplus getter effect/core/io/Fiber inheritRefs
 * @tsplus getter effect/core/io/RuntimeFiber inheritRefs
 */
export function inheritRefs<E, A>(
  self: Fiber<E, A>
): Effect<never, never, void> {
  realFiber(self)
  return self._inheritRefs
}
