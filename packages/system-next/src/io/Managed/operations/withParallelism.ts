import { currentParallelism } from "../../FiberRef/definition/data"
import { locallyManaged_ } from "../../FiberRef/operations/locallyManaged"
import { some } from "../../../data/Option"
import type { Managed } from "../definition"
import { zipRight_ } from "./zipRight"

/**
 * Returns a managed effect that describes setting the specified maximum
 * number of fibers for parallel operators as the `acquire` action and setting
 * it back to the original value as the `release` action.
 */
export function withParallelism_<R, E, A>(
  self: Managed<R, E, A>,
  n: number,
  __trace?: string
): Managed<R, E, A> {
  return zipRight_(
    locallyManaged_(currentParallelism.value, some(n), __trace),
    self,
    __trace
  )
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
