import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { map_ } from "./map"

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export function tap_<A, R, R2, E, E2, X>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R2, E2, X>,
  __trace?: string
) {
  return chain_(self, (a) => map_(f(a), () => a), __trace)
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 *
 * @ets_data_first tap_
 */
export function tap<A, R2, E2, X>(f: (a: A) => Managed<R2, E2, X>, __trace?: string) {
  return <R, E>(self: Managed<R, E, A>) => tap_(self, f, __trace)
}
