// ets_tracing: off

import * as Cause from "../Cause/core.js"
import { foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"

/**
 * Converts all failures to unchecked exceptions
 */
export function orDieKeep<R, E, A>(effect: Effect<R, E, A>, __trace?: string) {
  return foldCauseM_(
    effect,
    (ce) => halt(Cause.chain((e: E) => Cause.die(e))(ce)),
    succeed,
    __trace
  )
}
