import type { Either } from "../../../../data/Either"
import type { XSynchronized } from "../definition"

/**
 * Folds over the error and value types of the `XRef.Synchronized`, allowing
 * access to the state in transforming the `set` value. This is a more powerful
 * version of `fold` but requires unifying the error types.
 */
export function foldAll_<RA, RB, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
): XSynchronized<RA & RB, RB, EC, ED, C, D> {
  return self.foldAll(ea, eb, ec, ca, bd)
}

/**
 * Folds over the error and value types of the `XRef.Synchronized`, allowing
 * access to the state in transforming the `set` value. This is a more powerful
 * version of `fold` but requires unifying the error types.
 *
 * @ets_data_first foldAll_
 */
export function foldAll<EA, EB, EC, ED, A, B, C, D>(
  ea: (_: EA) => EC,
  eb: (_: EB) => ED,
  ec: (_: EB) => EC,
  ca: (_: C) => (_: B) => Either<EC, A>,
  bd: (_: B) => Either<ED, D>
) {
  return <RA, RB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA & RB, RB, EC, ED, C, D> => foldAll_(self, ea, eb, ec, ca, bd)
}
