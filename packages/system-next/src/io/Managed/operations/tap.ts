import type { Managed } from "../definition"

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 *
 * @tsplus fluent ets/Managed tap
 */
export function tap_<A, R, R2, E, E2, X>(
  self: Managed<R, E, A>,
  f: (a: A) => Managed<R2, E2, X>,
  __etsTrace?: string
) {
  return self.flatMap((a) => f(a).map(() => a))
}

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 *
 * @ets_data_first tap_
 */
export function tap<A, R2, E2, X>(
  f: (a: A) => Managed<R2, E2, X>,
  __etsTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>) => tap_(self, f)
}
