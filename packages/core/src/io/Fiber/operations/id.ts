import { realFiber } from "@effect/core/io/Fiber/definition"

/**
 * The identity of the fiber.
 *
 * @tsplus getter effect/core/io/Fiber id
 * @category getters
 * @since 1.0.0
 */
export function id<E, A>(self: Fiber<E, A>): FiberId {
  realFiber(self)
  return self.id
}
