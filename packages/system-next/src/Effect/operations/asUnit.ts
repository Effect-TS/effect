import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { unit } from "./unit"

/**
 * Ignores the result of the effect replacing it with a void
 */
export function asUnit<R, E, X>(self: Effect<R, E, X>, __trace?: string) {
  return chain_(self, () => unit, __trace)
}
