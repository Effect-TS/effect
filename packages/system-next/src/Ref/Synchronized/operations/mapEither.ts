// ets_tracing: off

import * as E from "../../../Either"
import type { XSynchronized } from "../definition"
import { dimapEither_ } from "./dimapEither"

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 */
export function mapEither_<RA, RB, EA, EB, EC, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (b: B) => E.Either<EC, C>
): XSynchronized<RA, RB, EA, EB | EC, A, C> {
  return dimapEither_(self, E.right, f)
}

/**
 * Transforms the `get` value of the `XRef` with the specified fallible
 * function.
 *
 * @ets_data_first mapEither_
 */
export function mapEither<EC, B, C>(f: (b: B) => E.Either<EC, C>) {
  return <RA, RB, EA, EB, A>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA, EB | EC, A, C> => mapEither_(self, f)
}
