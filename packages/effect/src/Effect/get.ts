import type { Option } from "../Option"
import { fold, none } from "../Option"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Unwraps the optional success of this effect, but can fail with an None value.
 */
export function get<R, A>(
  self: Effect<R, never, Option<A>>
): Effect<R, Option<never>, A> {
  return chain_(
    self,
    fold(() => fail(none), succeed)
  )
}
