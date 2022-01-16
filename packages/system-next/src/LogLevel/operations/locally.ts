// ets_tracing: off

import type { Effect } from "../../Effect"
import { currentLogLevel } from "../../FiberRef/definition/concrete"
import { locally_ as fiberRefLocally_ } from "../../FiberRef/operations/locally"
import type { LogLevel } from "../definition"

export function locally_<R, E, A>(
  self: Effect<R, E, A>,
  logLevel: LogLevel,
  __trace?: string
): Effect<R, E, A> {
  return fiberRefLocally_(currentLogLevel.value, logLevel, self, __trace)
}

export function locally(logLevel: LogLevel, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    locally_(self, logLevel, __trace)
}
