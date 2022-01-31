// ets_tracing: off

import { identity } from "../Function/index.js"
import { some } from "../Option/index.js"
import type { Effect } from "./effect.js"
import { unrefineWith_ } from "./unrefine.js"

/**
 * Unearth the unchecked failure of the effect. (opposite of `orDie`)
 */
export function resurrect<R, E, A>(
  self: Effect<R, E, A>,
  __trace?: string
): Effect<R, unknown, A> {
  return unrefineWith_(self, some, identity, __trace)
}
