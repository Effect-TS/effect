import { Managed } from "../definition"

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 *
 * @tsplus fluent ets/Managed tapError
 */
export function tapError_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (e: E) => Managed<R1, E1, X>,
  __etsTrace?: string
): Managed<R & R1, E | E1, A> {
  return self.tapBoth(f, Managed.succeedNow)
}

/**
 * Returns an effect that effectfully peeks at the failure of the acquired resource.
 *
 * @ets_data_first tapError_
 */
export function tapError<E, R1, E1, X>(
  f: (e: E) => Managed<R1, E1, X>,
  __etsTrace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => tapError_(self, f)
}
