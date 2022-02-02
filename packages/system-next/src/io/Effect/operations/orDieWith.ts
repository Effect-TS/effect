import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus fluent ets/Effect orDieWith
 */
export function orDieWith_<R, E, A>(
  self: Effect<R, E, A>,
  f: (e: E) => unknown,
  __etsTrace?: string
): RIO<R, A> {
  return self.foldEffect((e) => Effect.dieNow(f(e)), Effect.succeedNow)
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first orDieWith_
 */
export function orDieWith<E>(f: (e: E) => unknown, __etsTrace?: string) {
  return <R, A>(self: Effect<R, E, A>): RIO<R, A> => self.orDieWith(f)
}
