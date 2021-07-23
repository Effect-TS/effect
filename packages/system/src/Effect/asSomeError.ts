// ets_tracing: off

import * as O from "../Option"
import type { Effect } from "./effect"
import { mapError_ } from "./mapError"

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return mapError_(self, O.some, __trace)
}
