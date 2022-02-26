import type { Either } from "../../../../data/Either"
import type { XSynchronized } from "../definition"

/**
 * Folds over the error and value types of the `XRef.Synchronized`. This is a
 * highly polymorphic method that is capable of arbitrarily transforming the
 * error and value types of the `XRef.Synchronized`. For most use cases one of
 * the more specific combinators implemented in terms of `fold` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 *
 * @tsplus fluent ets/XSynchronized fold
 */
export function fold_<RA, RB, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
): XSynchronized<RA, RB, EC, ED, C, D> {
  return self._fold(ea, eb, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`. This is a
 * highly polymorphic method that is capable of arbitrarily transforming the
 * error and value types of the `XRef.Synchronized`. For most use cases one of
 * the more specific combinators implemented in terms of `fold` will be more
 * ergonomic but this method is extremely useful for implementing new
 * combinators.
 *
 * @ets_data_first fold_
 */
export function fold<EA, EB, EC, ED, A, B, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ca: (_: C) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
) {
  return <RA, RB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EC, ED, C, D> => self.fold(ea, eb, ca, bd)
}
