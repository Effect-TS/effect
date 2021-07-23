// ets_tracing: off

import * as O from "../Option/core"
import type { Effect } from "./effect"
import { map_ } from "./map"

/**
 * Maps the success value of this effect to an optional value.
 */
export function asSome<R, E, A>(fa: Effect<R, E, A>, __trace?: string) {
  return map_(fa, O.some, __trace)
}
