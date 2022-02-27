import { Option } from "../../../data/Option"
import { FiberRef } from "../../FiberRef"
import type { Managed } from "../definition"

/**
 * Returns a managed effect that describes setting the specified maximum
 * number of fibers for parallel operators as the `acquire` action and setting
 * it back to the original value as the `release` action.
 *
 * @tsplus fluent ets/Managed withParallelism
 */
export function withParallelism_<R, E, A>(
  self: Managed<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Managed<R, E, A> {
  return FiberRef.currentParallelism.value.locallyManaged(Option.some(n)).zipRight(self)
}

/**
 * Returns a managed effect that describes setting the specified maximum
 * number of fibers for parallel operators as the `acquire` action and setting
 * it back to the original value as the `release` action.
 *
 * @ets_data_first withParallelism_
 */
export function withParallelism(n: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, A> => self.withParallelism(n)
}
