import type * as E from "../../../Either"
import type { XSynchronized } from "../definition"

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 */
export function dimapEither_<RA, RB, EA, EB, EC, ED, A, B, C, D>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (c: C) => E.Either<EC, A>,
  g: (b: B) => E.Either<ED, D>
): XSynchronized<RA, RB, EA | EC, EB | ED, C, D> {
  return self.fold(
    (_: EA | EC) => _,
    (_: EB | ED) => _,
    f,
    g
  )
}

/**
 * Transforms both the `set` and `get` values of the `XRef` with the
 * specified fallible functions.
 *
 * @ets_data_first dimapEither_
 */
export function dimapEither<EC, ED, A, B, C, D>(
  f: (c: C) => E.Either<EC, A>,
  g: (b: B) => E.Either<ED, D>
) {
  return <RA, RB, EA, EB>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA | EC, EB | ED, C, D> => dimapEither_(self, f, g)
}
