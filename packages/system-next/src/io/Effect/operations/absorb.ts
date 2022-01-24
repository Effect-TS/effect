import { identity } from "../../../data/Function"
import type { Effect } from "../definition"
import { absorbWith_ } from "./absorbWith"

/**
 * Attempts to convert defects into a failure, throwing away all information
 * about the cause of the failure.
 *
 * @ets fluent ets/Effect absorb
 */
export function absorb<R, E, A>(self: Effect<R, E, A>, __trace?: string) {
  return absorbWith_(self, identity, __trace)
}
