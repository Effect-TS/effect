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
export function catchAllDefect_<S2, R2, E2, A2, S, R, E, A>(
  fa: Effect<S2, R2, E2, A2>,
  f: (_: unknown) => Effect<S, R, E, A>
) {
  return catchSomeDefect_(fa, (u) => O.some(f(u)))
}

/**
 * Recovers from all defects with provided function.
 *
 * '''WARNING''': There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 */
export function catchAllDefect<S, R, E, A>(f: (_: unknown) => Effect<S, R, E, A>) {
  return <S2, R2, E2, A2>(effect: Effect<S2, R2, E2, A2>) => catchAllDefect_(effect, f)
}
