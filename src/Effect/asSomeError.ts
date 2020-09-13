import * as O from "../Option"
import type { Effect } from "./effect"
import { mapError_ } from "./mapError"

/**
 * Maps the error value of this effect to an optional value.
 */
export function asSomeError<S, R, E, A>(self: Effect<S, R, E, A>) {
  return mapError_(self, (e) => O.some(e))
}
