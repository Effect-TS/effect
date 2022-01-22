import type { Effect } from "../definition"
import { failNow } from "./failNow"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @ets fluent ets/Effect mapBoth
 */
export function mapBoth_<R, E, A, E2, B>(
  self: Effect<R, E, A>,
  f: (e: E) => E2,
  g: (a: A) => B,
  __trace?: string
): Effect<R, E2, B> {
  return foldEffect_(
    self,
    (e) => failNow(f(e)),
    (a) => succeedNow(g(a)),
    __trace
  )
}

/**
 * Returns an effect whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @ets_data_first mapBoth_
 */
export function mapBoth<E, E2, A, B>(
  f: (e: E) => E2,
  g: (a: A) => B,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>): Effect<R, E2, B> => mapBoth_(self, f, g, __trace)
}
