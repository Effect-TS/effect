// tracing: off

import * as O from "../Option"
import { catchSomeDefect_ } from "./catchSomeDefect"
import type { Effect } from "./effect"

/**
 * Recovers from all defects with provided function.
 *
 * '''WARNING''': There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 */
export function catchAllDefect_<R2, E2, A2, R, E, A>(
  fa: Effect<R2, E2, A2>,
  f: (_: unknown) => Effect<R, E, A>,
  __trace?: string
) {
  return catchSomeDefect_(fa, (u) => O.some(f(u)), __trace)
}

/**
 * Recovers from all defects with provided function.
 *
 * '''WARNING''': There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 *
 * @dataFirst catchAllDefect_
 */
export function catchAllDefect<R, E, A>(
  f: (_: unknown) => Effect<R, E, A>,
  __trace?: string
) {
  return <R2, E2, A2>(effect: Effect<R2, E2, A2>) => catchAllDefect_(effect, f, __trace)
}
