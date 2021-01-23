import type { Effect } from "./effect"
import { fold_ } from "./fold_"

/**
 * Returns whether this effect is a success.
 */
export function isSuccess<R, E, A>(self: Effect<R, E, A>) {
  return fold_(
    self,
    () => false,
    () => true
  )
}
