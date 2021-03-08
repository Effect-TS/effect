// tracing: off

import { accessCallTrace, traceFrom } from "@effect-ts/tracing-utils"

import { traced } from "../Cause"
import { foldCauseM_, haltWith, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Attach a wrapping trace pointing to this location in case of error.
 *
 * Useful when joining fibers to make the resulting trace mention
 * the `join` point, otherwise only the traces of joined fibers are
 * included.
 *
 * @trace call
 */
export function refailWithTrace<R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> {
  const trace = accessCallTrace()
  return foldCauseM_(
    self,
    traceFrom(trace, (cause) => haltWith((trace) => traced(cause, trace()))),
    succeed
  )
}
