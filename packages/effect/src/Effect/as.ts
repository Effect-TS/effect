import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Maps the success value of this effect to the specified constant value.
 */
export function as_<R, E, A, B>(self: Effect<R, E, A>, b: B) {
  return map_(self, () => b)
}

/**
 * Maps the success value of this effect to the specified constant value.
 */
export function as<B>(b: B) {
  return <R, E, A>(self: Effect<R, E, A>) => map_(self, () => b)
}
