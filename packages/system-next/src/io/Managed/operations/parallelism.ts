import type { Option } from "../../../data/Option"
import { Effect } from "../../Effect"
import { currentParallelism } from "../../FiberRef/definition/data"
import { get as fiberRefGet } from "../../FiberRef/operations/get"
import { Managed } from "../definition"

/**
 * Retrieves the maximum number of fibers for parallel operators or `None` if
 * it is unbounded.
 *
 * @tsplus static ets/ManagedOps parallelism
 */
export const parallelism: Managed<unknown, never, Option<number>> = Managed.fromEffect(
  Effect.suspendSucceed(fiberRefGet(currentParallelism.value))
)
