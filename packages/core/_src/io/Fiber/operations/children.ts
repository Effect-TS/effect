import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * Retrieves the immediate children of the fiber.
 *
 * @tsplus fluent ets/Fiber children
 * @tsplus fluent ets/RuntimeFiber children
 */
export function children<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): Effect<never, never, Chunk<Fiber.Runtime<any, any>>> {
  realFiber(self)
  return self._children
}
