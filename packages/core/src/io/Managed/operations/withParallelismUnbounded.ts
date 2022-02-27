import { Option } from "../../../data/Option"
import { FiberRef } from "../../FiberRef"
import type { Managed } from "../definition"

/**
 * Returns a managed effect that describes setting an unbounded maximum number
 * of fibers for parallel operators as the `acquire` action and setting it
 * back to the original value as the `release` action.
 *
 * @tsplus fluent ets/Managed withParallelismUnbounded
 */
export function withParallelismUnbounded<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R, E, A> {
  return FiberRef.currentParallelism.value.locallyManaged(Option.none).zipRight(self)
}
