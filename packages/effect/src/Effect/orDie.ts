import type { Effect } from "./effect"
import { orDieWith } from "./orDieWith"

/**
 * Keeps none of the errors, and terminates the fiber with them, using
 * the specified function to convert the `E` into a `unknown`.
 */
export const orDie = <S, R, E, A>(effect: Effect<S, R, E, A>) =>
  orDieWith((e: E) => e)(effect)
