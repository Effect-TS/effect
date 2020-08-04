import { Cause } from "../Cause/cause"

import { Effect } from "./effect"
import { foldCauseM_ } from "./foldCauseM_"
import { succeed } from "./succeed"

/**
 * Recovers from all errors with provided cause.
 */
export const catchAllCause_ = <S2, R2, E2, A2, S, R, E, A>(
  effect: Effect<S2, R2, E2, A2>,
  f: (_: Cause<E2>) => Effect<S, R, E, A>
) => foldCauseM_(effect, f, (x) => succeed(x))

/**
 * Recovers from all errors with provided cause.
 */
export const catchAllCause = <S2, R2, E2, A2, S, R, E, A>(
  f: (_: Cause<E2>) => Effect<S, R, E, A>
) => (effect: Effect<S2, R2, E2, A2>) => foldCauseM_(effect, f, (x) => succeed(x))
