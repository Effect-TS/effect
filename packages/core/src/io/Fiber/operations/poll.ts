import type { Option } from "../../../data/Option"
import type { UIO } from "../../Effect"
import type { Exit } from "../../Exit"
import type { Fiber } from "../definition"
import { realFiber } from "../definition"

/**
 * Tentatively observes the fiber, but returns immediately if it is not
 * already done.
 *
 * @tsplus fluent ets/Fiber poll
 * @tsplus fluent ets/RuntimeFiber poll
 */
export function poll<E, A>(
  self: Fiber<E, A>,
  __tsplusTrace?: string
): UIO<Option<Exit<E, A>>> {
  realFiber(self)
  return self._poll
}
