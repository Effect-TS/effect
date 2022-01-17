import type { Either } from "../../Either"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Folds over the error and value types of the `XFiberRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XFiberRef`. For most use cases one of the more
 * specific combinators implemented in terms of `fold` will be more ergonomic
 * but this method is extremely useful for implementing new combinators.
 */
export function fold_<EA, EB, A, B, EC, ED, C = A, D = B>(
  self: XFiberRef<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
): XFiberRef<EC, ED, C, D> {
  concreteUnified(self)
  return self.fold(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XFiberRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XFiberRef`. For most use cases one of the more
 * specific combinators implemented in terms of `fold` will be more ergonomic
 * but this method is extremely useful for implementing new combinators.
 *
 * @ets_data_first fold_
 */
export function fold<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
) {
  return (self: XFiberRef<EA, EB, A, B>): XFiberRef<EC, ED, C, D> =>
    fold_(self, ea, eb, ca, bd)
}
