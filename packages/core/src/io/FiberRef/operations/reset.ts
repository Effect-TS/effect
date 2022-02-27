import type { UIO } from "../../Effect"
import type { Runtime } from "../definition"

/**
 * Reset the value of a `FiberRef` back to its initial value.
 *
 * @tsplus fluent ets/XFiberRef reset
 * @tsplus fluent ets/XFiberRefRuntime reset
 */
export function reset<A>(self: Runtime<A>, __tsplusTrace?: string): UIO<void> {
  return self._set(self.initial)
}
