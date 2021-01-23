import type { Effect } from "./effect"
import { fold_ } from "./fold_"

/**
 * Returns whether this effect is a failure.
 */
export function isFailure<R, E, A>(self: Effect<R, E, A>) {
  return fold_(
    self,
    () => true,
    () => false
  )
}
