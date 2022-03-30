import type { FiberRef } from "../definition"
import { concreteFiberRef } from "./_internal/FiberRefInternal"

/**
 * Returns the initial value of the `FiberRef`.
 *
 * @tsplus fluent ets/FiberRef initialValue
 */
export function initialValue<A>(self: FiberRef<A>): A {
  concreteFiberRef(self)
  return self._initial
}
