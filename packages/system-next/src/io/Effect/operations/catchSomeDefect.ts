import type { Option } from "../../../data/Option"
import type { Effect } from "../definition"
import { catchAll_ } from "./catchAll"
import { failNow } from "./failNow"
import { unrefineWith_ } from "./unrefineWith"

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @ets fluent ets/Effect catchSomeDefect
 */
export function catchSomeDefect_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  f: (_: unknown) => Option<Effect<R2, E2, A2>>,
  __trace?: string
): Effect<R & R2, E | E2, A | A2> {
  return catchAll_(
    unrefineWith_(self, f, failNow),
    (s): Effect<R2, E | E2, A2> => s,
    __trace
  )
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * **WARNING**: There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @dataFist catchSomeDefect_
 */
export function catchSomeDefect<R2, E2, A2>(
  f: (_: unknown) => Option<Effect<R2, E2, A2>>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A | A2> =>
    catchSomeDefect_(self, f, __trace)
}
