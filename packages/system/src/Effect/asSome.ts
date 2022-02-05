// ets_tracing: off

import * as O from "../Option/core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(fa: Effect<R, E, A>, __trace?: string) {
  return map_(fa, O.some, __trace)
}
