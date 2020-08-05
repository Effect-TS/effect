import { identity } from "../../Function"

import { Effect } from "./effect"
import { foreachParN_ } from "./foreachParN_"
import { foreachPar_ } from "./foreachPar_"
import { foreach_ } from "./foreach_"

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllPar`.
 */
export const collectAll = <S, R, E, A>(as: Iterable<Effect<S, R, E, A>>) =>
  foreach_(as, identity)

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 */
export const collectAllPar = <S, R, E, A>(as: Iterable<Effect<S, R, E, A>>) =>
  foreachPar_(as, identity)

/**
 * Evaluate each effect in the structure in parallel, and collect the
 * results. For a sequential version, see `collectAll`.
 *
 * Unlike `collectAllPar`, this method will use at most `n` fibers.
 */
export const collectAllParN = (n: number) => <S, R, E, A>(
  as: Iterable<Effect<S, R, E, A>>
) => foreachParN_(n)(as, identity)
