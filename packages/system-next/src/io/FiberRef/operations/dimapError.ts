import * as E from "../../../data/Either"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Transforms both the `set` and `get` errors of the `XFiberRef` with the
 * specified functions.
 */
export function dimapError_<EA, EB, A, B, EC, ED>(
  self: XFiberRef<EA, EB, A, B>,
  f: (ea: EA) => EC,
  g: (eb: EB) => ED
): XFiberRef<EC, ED, A, B> {
  concreteUnified(self)
  return self.fold(f, g, E.right, E.right)
}

/**
 * Transforms both the `set` and `get` errors of the `XFiberRef` with the
 * specified functions.
 *
 * @ets_data_first dimapError_
 */
export function dimapError<EA, EB, EC, ED>(f: (ea: EA) => EC, g: (eb: EB) => ED) {
  return <A, B>(self: XFiberRef<EA, EB, A, B>): XFiberRef<EC, ED, A, B> =>
    dimapError_(self, f, g)
}
