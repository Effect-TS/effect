import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * The identity of the fiber.
 *
 * @tsplus getter effect/core/io/Fiber id
 */
export function id<E, A>(self: Fiber<E, A>): FiberId {
  realFiber(self)
  return self._id
}
