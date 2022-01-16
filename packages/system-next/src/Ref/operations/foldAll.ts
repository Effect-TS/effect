// ets_tracing: off

import type { Either } from "../../Either"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 */
export function foldAll_<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  self: XRef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
): XRef<RA, RB, EC, ED, C, D> {
  return concrete(self).foldAll(ea, eb, ec, ca as any, bd as any) as XRef<
    RA,
    RB,
    EC,
    ED,
    C,
    D
  >
}

/**
 * Folds over the error and value types of the `XRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 *
 * @ets_data_first foldAll_
 */
export function foldAll<RA, RB, EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
) {
  return (self: XRef<RA, RB, EA, EB, A, B>): XRef<RA, RB, EC, ED, C, D> =>
    foldAll_(self, ea, eb, ec, ca, bd)
}
