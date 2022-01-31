// ets_tracing: off

import { chain_ } from "./core.js"
import type { Effect } from "./effect.js"
import { map_ } from "./map.js"

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @ets_data_first tap_
 */
export function tap<A, R, E, X>(
  f: (_: A) => Effect<R, E, X>,
  __trace?: string
): <E2, R2>(_: Effect<R2, E2, A>) => Effect<R & R2, E | E2, A> {
  return (fa) => tap_(fa, f, __trace)
}

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 */
export function tap_<E2, R2, A, R, E, X>(
  _: Effect<R2, E2, A>,
  f: (_: A) => Effect<R, E, X>,
  __trace?: string
) {
  return chain_(_, (a: A) => map_(f(a), () => a), __trace)
}
