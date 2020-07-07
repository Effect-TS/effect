import { identity } from "../../Function"

import { Effect } from "./effect"
import { foreachUnit_ } from "./foreachUnit_"

/**
 * Evaluate each effect in the structure from left to right, and collect the
 * results. For a parallel version, see `collectAllUnitPar`.
 */
export const collectAllUnit = <S, R, E, A>(as: Iterable<Effect<S, R, E, A>>) =>
  foreachUnit_(as, identity)
