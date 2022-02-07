// ets_tracing: off

import type * as O from "../Option/index.js"
import { catchAll_ } from "./catchAll.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { unrefineWith_ } from "./unrefine.js"

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * '''WARNING''': There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 */
export function catchSomeDefect_<R2, E2, A2, R, E, A>(
  fa: Effect<R2, E2, A2>,
  f: (_: unknown) => O.Option<Effect<R, E, A>>,
  __trace?: string
) {
  return catchAll_(unrefineWith_(fa, f, fail), (s): Effect<R, E | E2, A> => s, __trace)
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * '''WARNING''': There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @dataFist catchSomeDefect_
 */
export function catchSomeDefect<R, E, A>(
  f: (_: unknown) => O.Option<Effect<R, E, A>>,
  __trace?: string
) {
  return <R2, E2, A2>(effect: Effect<R2, E2, A2>) =>
    catchSomeDefect_(effect, f, __trace)
}
