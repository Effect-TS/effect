import { realFiber } from "@effect/core/io/Fiber/definition"
import type { Option } from "@fp-ts/data/Option"

/**
 * Tentatively observes the fiber, but returns immediately if it is not
 * already done.
 *
 * @tsplus getter effect/core/io/Fiber poll
 * @tsplus getter effect/core/io/RuntimeFiber poll
 */
export function poll<E, A>(
  self: Fiber<E, A>
): Effect<never, never, Option<Exit<E, A>>> {
  realFiber(self)
  return self.poll
}
