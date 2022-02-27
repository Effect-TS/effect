import type { Either } from "../../../data/Either"
import { identity } from "../../../data/Function"
import type { XFiberRef } from "../definition"
import { concreteUnified } from "../definition"

/**
 * Transforms both the `set` and `get` values of the `XFiberRef` with the
 * specified fallible functions.
 *
 * @tsplus fluent ets/XFiberRef dimapEither
 * @tsplus fluent ets/XFiberRefRuntime dimapEither
 */
export function dimapEither_<EA, EB, A, B, EC, ED, C, D>(
  self: XFiberRef<EA, EB, A, B>,
  f: (c: C) => Either<EA | EC, A>,
  g: (b: B) => Either<EB | ED, D>
): XFiberRef<EA | EC, EB | ED, C, D> {
  concreteUnified(self)
  return self._fold(identity, identity, f, g)
}

/**
 * Transforms both the `set` and `get` values of the `XFiberRef` with the
 * specified fallible functions.
 *
 * @ets_data_first dimapEither_
 */
export function dimapEither<EA, EB, A, B, EC, ED, C, D>(
  f: (c: C) => Either<EA | EC, A>,
  g: (b: B) => Either<EB | ED, D>
) {
  return (self: XFiberRef<EA, EB, A, B>): XFiberRef<EA | EC, EB | ED, C, D> =>
    self.dimapEither(f, g)
}
