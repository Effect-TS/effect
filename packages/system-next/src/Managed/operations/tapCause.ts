// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Managed } from "../definition"
import { catchAllCause_ } from "./catchAllCause"
import { chain_ } from "./chain"
import { failCause } from "./failCause"

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 */
export function tapErrorCause_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (c: Cause<E>) => Managed<R1, E1, X>,
  __trace?: string
): Managed<R & R1, E | E1, A> {
  return catchAllCause_(self, (c) => chain_(f(c), () => failCause(c)), __trace)
}

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 *
 * @ets_data_first tapErrorCause_
 */
export function tapErrorCause<E, R1, E1, X>(
  f: (c: Cause<E>) => Managed<R1, E1, X>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    tapErrorCause_(self, f, __trace)
}
