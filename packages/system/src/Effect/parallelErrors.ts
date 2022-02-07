// ets_tracing: off

import type { Cause } from "../Cause/index.js"
import { failures } from "../Cause/index.js"
import { foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Exposes all parallel errors in a single call
 */
export function parallelErrors<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, readonly E[], A> {
  return foldCauseM_(
    self,
    (cause) => {
      const f = failures(cause)

      if (f.length === 0) {
        return halt(<Cause<never>>cause)
      } else {
        return fail(f)
      }
    },
    succeed,
    __trace
  )
}
