import { Managed } from "../definition"

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 *
 * @ets fluent ets/Managed mapError
 */
export function mapError_<R, E, A, E1>(
  self: Managed<R, E, A>,
  f: (e: E) => E1,
  __etsTrace?: string
): Managed<R, E1, A> {
  return Managed(self.effect.mapError(f))
}

/**
 * Returns an effect whose failure is mapped by the specified `f` function.
 *
 * @ets_data_first mapError_
 */
export function mapError<E, E1>(f: (e: E) => E1, __etsTrace?: string) {
  ;<R, A>(self: Managed<R, E, A>): Managed<R, E1, A> => mapError_(self, f)
}
