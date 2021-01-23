import { map as mapCause } from "../Cause"
import { flow } from "../Function"
import type { Option } from "../Option"
import { fold, none, some } from "../Option"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

/**
 * Unwraps the optional success of this effect, but can fail with an None value.
 */
export function get<R, E, A>(self: Effect<R, E, Option<A>>): Effect<R, Option<E>, A> {
  return foldCauseM_(
    self,
    flow(mapCause(some), halt),
    fold(() => fail(none), succeed)
  )
}
