import type * as O from "../Option"
import { catchAll_ } from "./catchAll_"
import type { Effect } from "./effect"
import { fail } from "./fail"
import { unrefineWith_ } from "./unrefine"

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * '''WARNING''': There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 */
export function catchSomeDefect_<S2, R2, E2, A2, S, R, E, A>(
  fa: Effect<S2, R2, E2, A2>,
  f: (_: unknown) => O.Option<Effect<S, R, E, A>>
) {
  return catchAll_(unrefineWith_(fa, f, fail), (s): Effect<S, R, E | E2, A> => s)
}

/**
 * Recovers from some or all of the defects with provided partial function.
 *
 * '''WARNING''': There is no sensible way to recover from defects. This
 * method should be used only at the boundary between Effect and an external
 * system, to transmit information on a defect for diagnostic or explanatory
 * purposes.
 */
export function catchSomeDefect<S, R, E, A>(
  f: (_: unknown) => O.Option<Effect<S, R, E, A>>
) {
  return <S2, R2, E2, A2>(effect: Effect<S2, R2, E2, A2>) => catchSomeDefect_(effect, f)
}
