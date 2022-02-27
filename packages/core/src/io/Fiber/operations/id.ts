import type { FiberId } from "../../FiberId"
import type { Fiber } from "../definition"
import { realFiber } from "../definition"

/**
 * The identity of the fiber.
 *
 * @tsplus getter ets/Fiber id
 * @tsplus getter ets/RuntimeFiber id
 */
export function id<E, A>(self: Fiber<E, A>): FiberId {
  realFiber(self)
  return self._id
}
