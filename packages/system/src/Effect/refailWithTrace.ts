// ets_tracing: off

import { traced } from "../Cause/index.js"
import { foldCauseM_, haltWith, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Attach a wrapping trace pointing to this location in case of error.
 *
 * Useful when joining fibers to make the resulting trace mention
 * the `join` point, otherwise only the traces of joined fibers are
 * included.
 */
export function refailWithTrace<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, E, A> {
  return foldCauseM_(
    self,
    (cause) => haltWith((trace) => traced(cause, trace())),
    succeed,
    __trace
  )
}
