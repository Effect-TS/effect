import { chain_ } from "./chain_"
import { Effect } from "./effect"

/**
 * Repeats this effect forever (until the first error).
 */
export const forever = <S, R, E, A>(effect: Effect<S, R, E, A>): Effect<S, R, E, A> =>
  chain_(effect, () => forever(effect))
