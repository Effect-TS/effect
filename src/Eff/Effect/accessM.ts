import { AnyEnv } from "./AnyEnv"
import { Effect } from "./effect"
import { IRead } from "./primitives"

/**
 * Effectfully accesses the environment of the effect.
 */
export const accessM = <S, R, E, A, R0 extends AnyEnv = {}>(
  f: (_: R0) => Effect<S, R, E, A>
): Effect<S, R & R0, E, A> => new IRead(f)
