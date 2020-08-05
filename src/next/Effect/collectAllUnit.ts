import { identity } from "../../Function"

import { Effect } from "./effect"
import { foreachUnitParN_ } from "./foreachUnitParN_"
import { foreachUnitPar_ } from "./foreachUnitPar_"
import { foreachUnit_ } from "./foreachUnit_"

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export const collectAllUnit = <S, R, E, A>(as: Iterable<Effect<S, R, E, A>>) =>
  foreachUnit_(as, identity)

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 */
export const collectAllUnitPar = <S, R, E, A>(as: Iterable<Effect<S, R, E, A>>) =>
  foreachUnitPar_(as, identity)

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 */
export const collectAllUnitParN = (n: number) => <S, R, E, A>(
  as: Iterable<Effect<S, R, E, A>>
) => foreachUnitParN_(n)(as, identity)
