// ets_tracing: off

import { currentParallelism } from "../../FiberRef/definition/concrete"
import { locallyManaged_ } from "../../FiberRef/operations/locallyManaged"
import { none } from "../../Option"
import type { Managed } from "../definition"
import { zipRight_ } from "./zipRight"

/**
 * Returns a managed effect that describes setting an unbounded maximum number
 * of fibers for parallel operators as the `acquire` action and setting it
 * back to the original value as the `release` action.
 */
export function withParallelismUnbounded<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R, E, A> {
  return zipRight_(locallyManaged_(currentParallelism.value, none), self, __trace)
}
