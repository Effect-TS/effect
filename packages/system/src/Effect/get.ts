// ets_tracing: off

import { map_ as mapCause } from "../Cause/index.js"
import type { Option } from "../Option/index.js"
import * as O from "../Option/index.js"
import { foldCauseM_, halt, succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"

/**
 * Unwraps the optional success of this effect, but can fail with an None value.
 */
export function get<R, E, A>(
  self: Effect<R, E, Option<A>>,
  __trace?: string
): Effect<R, Option<E>, A> {
  return foldCauseM_(
    self,
    (x) => halt(mapCause(x, O.some)),
    O.fold(() => fail(O.none), succeed),
    __trace
  )
}
