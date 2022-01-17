import type { Cause } from "../../Cause"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as T from "./_internal/effect"

/**
 * Returns an effect whose full failure is mapped by the specified `f`
 * function.
 */
export function mapErrorCause_<R, E, A, E1>(
  self: Managed<R, E, A>,
  f: (cause: Cause<E>) => Cause<E1>,
  __trace?: string
): Managed<R, E1, A> {
  return managedApply(T.mapErrorCause_(self.effect, f))
}

/**
 * Returns an effect whose full failure is mapped by the specified `f`
 * function.
 *
 * @ets_data_first mapErrorCause_
 */
export function mapErrorCause<E, E1>(
  f: (cause: Cause<E>) => Cause<E1>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R, E1, A> =>
    mapErrorCause_(self, f, __trace)
}
