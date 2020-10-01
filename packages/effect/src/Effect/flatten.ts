import { identity } from "../Function"
import { chain_ } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect that first executes the outer effect, and then executes
 * the inner effect, returning the value from the inner effect, and effectively
 * flattening a nested effect.
 */
export function flatten<R, E, R1, E1, A>(effect: Effect<R, E, Effect<R1, E1, A>>) {
  return chain_(effect, identity)
}
