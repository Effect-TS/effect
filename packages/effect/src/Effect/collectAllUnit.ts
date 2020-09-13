import { identity } from "../Function"
import type { Effect } from "./effect"
import { foreachUnit_ } from "./foreachUnit_"
import { foreachUnitPar_ } from "./foreachUnitPar_"
import { foreachUnitParN_ } from "./foreachUnitParN_"

/**
 * Evaluate each effect in the structure from left to right, and discard the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export function collectAllUnit<S, R, E, A>(as: Iterable<Effect<S, R, E, A>>) {
  return foreachUnit_(as, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 */
export function collectAllUnitPar<S, R, E, A>(as: Iterable<Effect<S, R, E, A>>) {
  return foreachUnitPar_(as, identity)
}

/**
 * Evaluate each effect in the structure in parallel, and discard the
 * results. For a sequential version, see `collectAllUnit`.
 *
 * Unlike `collectAllUnitPar`, this method will use at most `n` fibers.
 */
export function collectAllUnitParN(n: number) {
  return <S, R, E, A>(as: Iterable<Effect<S, R, E, A>>) =>
    foreachUnitParN_(n)(as, identity)
}
