import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { map_ } from "./map_"

/**
 * Returns an effect that effectfully "peeks" at the success of this effect.
 */
export const chainTap_ = <S2, E2, R2, A, S, R, E>(
  _: Effect<S2, R2, E2, A>,
  f: (_: A) => Effect<S, R, E, any>
) => chain_(_, (a: A) => map_(f(a), () => a))
