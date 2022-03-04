import type { Either } from "../../../data/Either"
import type { XTRef } from "../definition"
import { concrete } from "../definition"

/**
 * Folds over the error and value types of the `XTRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XTRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 *
 * @tsplus fluent ets/XTRef fold
 */
export function fold_<EA, EB, EC, ED, A, B, C, D>(
  self: XTRef<EA, EB, A, B>,
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ca: (c: C) => Either<EC, A>,
  bd: (b: B) => Either<ED, D>
): XTRef<EC, ED, C, D> {
  concrete(self)
  return self._fold(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XTRef`. This is a highly
 * polymorphic method that is capable of arbitrarily transforming the error
 * and value types of the `XTRef`. For most use cases one of the more specific
 * combinators implemented in terms of `fold` will be more ergonomic but this
 * method is extremely useful for implementing new combinators.
 *
 * @ets_data_first fold_
 */
export function fold<EA, EB, EC, ED, A, B, C, D>(
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ca: (c: C) => Either<EC, A>,
  bd: (b: B) => Either<ED, D>
) {
  return (self: XTRef<EA, EB, A, B>): XTRef<EC, ED, C, D> => self.fold(ea, eb, ca, bd)
}
