import type { Option } from "../../../data/Option"
import { suspendSucceed } from "../../Effect/operations/suspendSucceed"
import { currentParallelism } from "../../FiberRef/definition/data"
import { get } from "../../FiberRef/operations/get"
import type { Managed } from "../definition"
import { fromEffect } from "./fromEffect"

/**
 * Retrieves the maximum number of fibers for parallel operators or `None` if
 * it is unbounded.
 */
export const parallelism: Managed<unknown, never, Option<number>> = fromEffect(
  suspendSucceed(() => get(currentParallelism.value))
)
