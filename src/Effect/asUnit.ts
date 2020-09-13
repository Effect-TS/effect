import { chain_, unit } from "./core"
import type { Effect } from "./effect"

/**
 * Ignores the result of the effect replacing it with a void
 */
export function asUnit<S, R, E>(_: Effect<S, R, E, any>) {
  return chain_(_, () => unit)
}
