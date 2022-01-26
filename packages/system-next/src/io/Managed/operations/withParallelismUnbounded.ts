import { none as optionNone } from "../../../data/Option"
import { currentParallelism } from "../../FiberRef/definition/data"
import { locallyManaged_ } from "../../FiberRef/operations/locallyManaged"
import type { Managed } from "../definition"

/**
 * Returns a managed effect that describes setting an unbounded maximum number
 * of fibers for parallel operators as the `acquire` action and setting it
 * back to the original value as the `release` action.
 *
 * @ets fluent ets/Managed withParallelismUnbounded
 */
export function withParallelismUnbounded<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R, E, A> {
  return locallyManaged_(currentParallelism.value, optionNone).zipRight(self)
}
