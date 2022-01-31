// ets_tracing: off

import * as O from "../Option/index.js"
import type { Effect } from "./effect.js"
import { mapError_ } from "./mapError.js"

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return mapError_(self, O.some, __trace)
}
