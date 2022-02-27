import type { Either } from "../../../data/Either"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Folds over the error and value types of the `XFiberRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 *
 * @tsplus fluent ets/XFiberRef foldAll
 * @tsplus fluent ets/XFiberRefRuntime foldAll
 */
export function foldAll_<EA, EB, A, B, EC, ED, C = A, D = B>(
  self: XFiberRef<EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
): XFiberRef<EC, ED, C, D> {
  concreteUnified(self)
  return self._foldAll(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `XFiberRef`, allowing access to
 * the state in transforming the `set` value. This is a more powerful version
 * of `fold` but requires unifying the error types.
 *
 * @ets_data_first foldAll
 */
export function foldAll<EA, EB, A, B, EC, ED, C = A, D = B>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
) {
  return (self: XFiberRef<EA, EB, A, B>): XFiberRef<EC, ED, C, D> =>
    self.foldAll(ea, eb, ec, ca, bd)
}
