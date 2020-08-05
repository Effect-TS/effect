import { Effect } from "./effect"
import { foldM_ } from "./foldM_"
import { succeedNow } from "./succeedNow"

/**
 * Recovers from all errors.
 */
export const catchAll_ = <S2, R2, E2, A2, S, R, E, A>(
  effect: Effect<S2, R2, E2, A2>,
  f: (e: E2) => Effect<S, R, E, A>
) => foldM_(effect, f, (x) => succeedNow(x))
