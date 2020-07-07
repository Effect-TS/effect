import { die } from "./die"
import { Effect } from "./effect"
import { foldM_ } from "./foldM_"
import { succeedNow } from "./succeedNow"

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `unknown`.
 */
export const orDieWith_ = <S, R, E, A>(
  effect: Effect<S, R, E, A>,
  f: (e: E) => unknown
) => foldM_(effect, (e) => die(f(e)), succeedNow)
