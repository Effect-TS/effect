import { Effect } from "./effect"
import { IRead } from "./primitives"

/**
 * Effectfully accesses the environment of the effect.
 */
export const accessM = <R0, S, R, E, A>(
  f: (_: R0) => Effect<S, R, E, A>
): Effect<S, R & R0, E, A> => new IRead(f)
