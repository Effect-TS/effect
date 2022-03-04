import type { Either } from "../../../data/Either"
import type { XTRef } from "../definition"
import { concrete } from "../definition"

/**
 * Folds over the error and value types of the `XTRef`, allowing access to the
 * state in transforming the `set` value. This is a more powerful version of
 * `fold` but requires unifying the error types.
 *
 * @tsplus fluent ets/XTRef foldAll
 */
export function foldAll_<EA, EB, EC, ED, A, B, C, D>(
  self: XTRef<EA, EB, A, B>,
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ec: (ea: EB) => EC,
  ca: (c: C) => (b: B) => Either<EC, A>,
  bd: (b: B) => Either<ED, D>
): XTRef<EC, ED, C, D> {
  concrete(self)
  return self._foldAll(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `XTRef`, allowing access to the
 * state in transforming the `set` value. This is a more powerful version of
 * `fold` but requires unifying the error types.
 *
 * @ets_data_first foldAll_
 */
export function foldAll<EA, EB, EC, ED, A, B, C, D>(
  ea: (ea: EA) => EC,
  eb: (ea: EB) => ED,
  ec: (ea: EB) => EC,
  ca: (c: C) => (b: B) => Either<EC, A>,
  bd: (b: B) => Either<ED, D>
) {
  return (self: XTRef<EA, EB, A, B>): XTRef<EC, ED, C, D> =>
    self.foldAll(ea, eb, ec, ca, bd)
}
