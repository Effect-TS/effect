import type { Cause } from "../../Cause"
import { Managed } from "../definition"

/**
 * Returns an effect whose full failure is mapped by the specified `f`
 * function.
 *
 * @ets fluent ets/Managed mapErrorCause
 */
export function mapErrorCause_<R, E, A, E1>(
  self: Managed<R, E, A>,
  f: (cause: Cause<E>) => Cause<E1>,
  __etsTrace?: string
): Managed<R, E1, A> {
  return Managed(self.effect.mapErrorCause(f))
}

/**
 * Returns an effect whose full failure is mapped by the specified `f`
 * function.
 *
 * @ets_data_first mapErrorCause_
 */
export function mapErrorCause<E, E1>(
  f: (cause: Cause<E>) => Cause<E1>,
  __etsTrace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R, E1, A> => mapErrorCause_(self, f)
}
