import type { Effect } from "../../Effect"
import type { Managed } from "../definition"

/**
 * Like `Managed.tap`, but uses a function that returns an `Effect` value rather
 * than a `Managed` value.
 *
 * @tsplus fluent ets/Managed tapEffect
 */
export function tapEffect_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (a: A) => Effect<R1, E1, X>,
  __tsplusTrace?: string
): Managed<R & R1, E | E1, A> {
  return self.mapEffect((a) => f(a).map(() => a))
}

/**
 * Like `Managed.tap`, but uses a function that returns an `Effect` value rather
 * than a `Managed` value.
 *
 * @ets_data_first tapEffect_
 */
export function tapEffect<R1, E1, A, X>(
  f: (a: A) => Effect<R1, E1, X>,
  __tsplusTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    tapEffect_(self, f)
}
