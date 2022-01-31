import type { Managed } from "../definition"

/**
 * Maps this `Managed` to the specified constant while preserving the effects of
 * this `Managed`.
 *
 * @ets fluent ets/Managed as
 */
export function as_<R, E, A, B>(
  self: Managed<R, E, A>,
  value: B,
  __etsTrace?: string
): Managed<R, E, B> {
  return self.map(() => value)
}

/**
 * Maps this `Managed` to the specified constant while preserving the effects of
 * this `Managed`.
 *
 * @ets_data_first as_
 */
export function as<B>(value: B, __etsTrace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R, E, B> => as_(self, value)
}
