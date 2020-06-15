import { chain_ } from "./chain_"
import { Effect } from "./effect"
import { succeedNow } from "./succeedNow"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export const map_ = <S, R, E, A, B>(_: Effect<S, R, E, A>, f: (a: A) => B) =>
  chain_(_, (a: A) => succeedNow(f(a)))
