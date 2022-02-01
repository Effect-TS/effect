import type { Cause } from "../../Cause"
import { Managed } from "../definition"

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 *
 * @tsplus fluent ets/Managed tapErrorCause
 */
export function tapErrorCause_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (c: Cause<E>) => Managed<R1, E1, X>,
  __etsTrace?: string
): Managed<R & R1, E | E1, A> {
  return self.catchAllCause((c) => f(c).flatMap(() => Managed.failCauseNow(c)))
}

/**
 * Returns an effect that effectually peeks at the cause of the failure of
 * the acquired resource.
 *
 * @ets_data_first tapErrorCause_
 */
export function tapErrorCause<E, R1, E1, X>(
  f: (c: Cause<E>) => Managed<R1, E1, X>,
  __etsTrace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    self.tapErrorCause(f)
}
