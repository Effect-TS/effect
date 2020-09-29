import { chain_ } from "./core"
import type { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 */
export function tap_<E2, R2, A, R, E>(
  _: Effect<R2, E2, A>,
  f: (_: A) => Effect<R, E, any>
) {
  return chain_(_, (a: A) => map_(f(a), () => a))
}
