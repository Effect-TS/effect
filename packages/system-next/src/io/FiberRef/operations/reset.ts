import type { UIO } from "../../Effect"
import type * as FiberRef from "../definition"

/**
 * Reset the value of a `FiberRef` back to its initial value.
 */
export function reset<A>(self: FiberRef.Runtime<A>, __trace?: string): UIO<void> {
  return self.set(self.initial)
}
