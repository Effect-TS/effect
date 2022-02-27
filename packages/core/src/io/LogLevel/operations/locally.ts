import type { Effect } from "../../Effect"
import { FiberRef } from "../../FiberRef"
import type { LogLevel } from "../definition"

/**
 * @tsplus static ets/LogLevelOps __call
 * @tsplus static ets/LogLevelOps locally
 */
export function locally<R, E, A>(
  self: LogLevel,
  __tsplusTrace?: string
): (use: Effect<R, E, A>) => Effect<R, E, A> {
  return FiberRef.currentLogLevel.value.locally(self)
}
