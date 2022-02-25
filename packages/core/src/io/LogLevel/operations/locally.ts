import type { Effect } from "../../Effect"
import { currentLogLevel } from "../../FiberRef/definition/data"
import { locally_ as fiberRefLocally_ } from "../../FiberRef/operations/locally"
import type { LogLevel } from "../definition"

/**
 * @tsplus static ets/LogLevelOps __call
 * @tsplus static ets/LogLevelOps locally
 */
export function locally<R, E, A>(
  self: LogLevel,
  __tsplusTrace?: string
): (use: Effect<R, E, A>) => Effect<R, E, A> {
  return fiberRefLocally_(currentLogLevel.value, self)
}
