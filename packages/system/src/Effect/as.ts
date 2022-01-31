// ets_tracing: off

import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Maps the success value of this effect to the specified constant value.
 */
export function as_<R, E, A, B>(self: Effect<R, E, A>, b: B, __trace?: string) {
  return map_(self, () => b, __trace)
}

/**
 * Maps the success value of this effect to the specified constant value.
 *
 * @ets_data_first as_
 */
export function as<B>(b: B, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>) => as_(self, b, __trace)
}
