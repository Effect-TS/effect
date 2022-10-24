import { realFiber } from "@effect/core/io/Fiber/definition"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Retrieves the immediate children of the fiber.
 *
 * @tsplus getter effect/core/io/Fiber children
 * @tsplus getter effect/core/io/RuntimeFiber children
 * @category getters
 * @since 1.0.0
 */
export function children<E, A>(
  self: Fiber<E, A>
): Effect<never, never, Chunk<Fiber.Runtime<any, any>>> {
  realFiber(self)
  return self.children
}
