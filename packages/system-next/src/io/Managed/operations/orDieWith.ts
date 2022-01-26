import { Managed } from "../definition"

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @ets fluent ets/Managed orDieWith
 */
export function orDieWith_<R, E, A>(
  self: Managed<R, E, A>,
  f: (e: E) => unknown,
  __etsTrace?: string
): Managed<R, never, A> {
  return self.mapError(f).catchAll(Managed.dieNow)
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first orDieWith_
 */
export function orDieWith<E>(f: (e: E) => unknown, __etsTrace?: string) {
  return <R, A>(self: Managed<R, E, A>): Managed<R, never, A> => orDieWith_(self, f)
}
