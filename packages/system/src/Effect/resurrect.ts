// ets_tracing: off

import { identity } from "../Function"
import { some } from "../Option"
import type { Effect } from "./effect"
import { unrefineWith_ } from "./unrefine"

/**
 * Unearth the unchecked failure of the effect. (opposite of `orDie`)
 */
export function resurrect<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, unknown, A> {
  return unrefineWith_(self, some, identity, __trace)
}
