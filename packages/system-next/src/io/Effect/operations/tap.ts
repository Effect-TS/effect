import type { Effect } from "../definition"
import { chain_ } from "./chain"
import { map_ } from "./map"

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @ets_data_first tap_
 */
export function tap<R, E, A, X>(
  f: (_: A) => Effect<R, E, X>,
  __trace?: string
): <R2, E2>(_: Effect<R2, E2, A>) => Effect<R & R2, E | E2, A> {
  return (fa) => tap_(fa, f, __trace)
}

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @ets fluent ets/Effect tap
 */
export function tap_<R2, E2, A, R, E, X>(
  _: Effect<R2, E2, A>,
  f: (_: A) => Effect<R, E, X>,
  __trace?: string
) {
  return chain_(_, (a: A) => map_(f(a), () => a), __trace)
}
