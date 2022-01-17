import type { Effect, RIO } from "../definition"
import { die } from "./die"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 */
export function orDieWith_<R, E, A>(
  self: Effect<R, E, A>,
  f: (e: E) => unknown,
  __trace?: string
): RIO<R, A> {
  return foldEffect_(self, (e) => die(f(e)), succeedNow)
}

/**
 * Keeps none of the errors, and terminates the fiber with them, using the
 * specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first orDieWith_
 */
export function orDieWith<E>(f: (e: E) => unknown, __trace?: string) {
  return <R, A>(self: Effect<R, E, A>): RIO<R, A> => orDieWith_(self, f, __trace)
}
