import { identity, pipe } from "../Function"
import { chain } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect that first executes the outer effect, and then executes
 * the inner effect, returning the value from the inner effect, and effectively
 * flattening a nested effect.
 */
export const flatten = <S, R, E, S1, R1, E1, A>(
  effect: Effect<S, R, E, Effect<S1, R1, E1, A>>
) => pipe(effect, chain(identity))
