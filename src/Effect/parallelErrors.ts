import type { Cause } from "../Cause"
import { failures } from "../Cause"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Exposes all parallel errors in a single call
 */
export function parallelErrors<R, E, A>(
  self: Effect<R, E, A>
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
    succeed
  )
}
