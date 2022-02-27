import type { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../Effect"
import type { Fiber } from "../definition"
import { realFiber } from "../definition"

/**
 * Retrieves the immediate children of the fiber.
 *
 * @tsplus getter ets/Fiber children
 * @tsplus getter ets/RuntimeFiber children
 */
export function children<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): UIO<Chunk<Fiber.Runtime<any, any>>> {
  realFiber(self)
  return self._children
}
