import { chain_, succeed } from "./core"
import type { Effect } from "./effect"

/**
 * Returns an effect whose success is mapped by the specified `f` function.
 */
export const map_ = <S, R, E, A, B>(_: Effect<S, R, E, A>, f: (a: A) => B) =>
  chain_(_, (a: A) => succeed(f(a)))
