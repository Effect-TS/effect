import * as O from "../../../data/Option"
import type { Effect } from "../definition"
import { catchSomeDefect_ } from "./catchSomeDefect"

/**
 * Recovers from all defects with provided function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @ets fluent ets/Effect catchAllDefect
 */
export function catchAllDefect_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (defect: unknown) => Effect<R2, E2, A2>,
  __etsTrace?: string
): Effect<R & R2, E | E2, A | A2> {
  return catchSomeDefect_(self, (d) => O.some(f(d)), __etsTrace)
}

/**
 * Recovers from all defects with provided function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @ets_data_first catchAllDefect_
 */
export function catchAllDefect<R2, E2, A2>(
  f: (defect: unknown) => Effect<R2, E2, A2>,
  __etsTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    catchAllDefect_(self, f, __etsTrace)
}
