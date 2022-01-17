import type { Either } from "../../Either"
import type { XRef } from "../definition"
import { concrete } from "../definition"

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 */
export function fold_<RA, RB, EA, EB, EC, ED, A, B, C = A, D = B>(
  self: XRef<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
): XRef<RA, RB, EC, ED, C, D> {
  return concrete(self).fold(ea, eb, ca, bd as any)
}

/**
 * Folds over the error and value types of the `XRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 *
 * @ets_data_first fold_
 */
export function fold<EA, EB, EC, ED, A, B, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
) {
  return <RA, RB>(self: XRef<RA, RB, EA, EB, A, B>): XRef<RA, RB, EC, ED, C, D> =>
    fold_(self, ea, eb, ca, bd)
}
