import type { Managed } from "../definition"
import * as T from "./_internal/effect"
import { mapEffect_ } from "./mapEffect"

/**
 * Like `Managed.tap`, but uses a function that returns an `Effect` value rather
 * than a `Managed` value.
 */
export function tapEffect_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (a: A) => T.Effect<R1, E1, X>,
  __trace?: string
): Managed<R & R1, E | E1, A> {
  return mapEffect_(self, (a) => T.map_(f(a), () => a), __trace)
}

/**
 * Like `Managed.tap`, but uses a function that returns an `Effect` value rather
 * than a `Managed` value.
 *
 * @ets_data_first tapEffect_
 */
export function tapEffect<R1, E1, A, X>(
  f: (a: A) => T.Effect<R1, E1, X>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    tapEffect_(self, f, __trace)
}
