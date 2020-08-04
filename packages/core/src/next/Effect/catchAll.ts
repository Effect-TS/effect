import { Effect } from "./effect"
import { foldM_ } from "./foldM_"
import { succeed } from "./succeed"

/**
 * Recovers from all errors.
 */
export const catchAll = <S, R, E, E2, A>(f: (e: E2) => Effect<S, R, E, A>) => <
  S2,
  R2,
  A2
>(
  effect: Effect<S2, R2, E2, A2>
) => foldM_(effect, f, (x) => succeed(x))
