import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * Retrieves the immediate children of the fiber.
 *
 * @tsplus getter effect/core/io/Fiber children
 * @tsplus getter effect/core/io/RuntimeFiber children
 */
export function children<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): Effect<never, never, Chunk<Fiber.Runtime<any, any>>> {
  realFiber(self)
  return self._children
}
