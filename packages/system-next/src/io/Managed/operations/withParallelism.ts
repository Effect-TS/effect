import { Option } from "../../../data/Option"
import { currentParallelism } from "../../FiberRef/definition/data"
import { locallyManaged_ } from "../../FiberRef/operations/locallyManaged"
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
  __etsTrace?: string
): Managed<R, E, A> {
  return locallyManaged_(currentParallelism.value, Option.some(n)).zipRight(self)
}

/**
 * Returns a managed effect that describes setting the specified maximum
 * number of fibers for parallel operators as the `acquire` action and setting
 * it back to the original value as the `release` action.
 *
 * @ets_data_first withParallelism_
 */
export function withParallelism(n: number, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, A> =>
    withParallelism_(self, n, __trace)
}
