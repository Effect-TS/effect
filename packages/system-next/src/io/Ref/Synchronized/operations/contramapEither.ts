import { Either } from "../../../../data/Either"
import type { XSynchronized } from "../definition"
import { dimapEither_ } from "./dimapEither"

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 */
export function contramapEither_<RA, RB, EA, EB, EC, A, B, C>(
  self: XSynchronized<RA, RB, EA, EB, A, B>,
  f: (c: C) => Either<EC, A>
): XSynchronized<RA, RB, EA | EC, EB, C, B> {
  return dimapEither_(self, f, Either.right)
}

/**
 * Transforms the `set` value of the `XRef` with the specified fallible
 * function.
 *
 * @ets_data_first contramapEither_
 */
export function contramapEither<EC, A, C>(f: (c: C) => Either<EC, A>) {
  return <RA, RB, EA, EB, B>(
    self: XSynchronized<RA, RB, EA, EB, A, B>
  ): XSynchronized<RA, RB, EA | EC, EB, C, B> => contramapEither_(self, f)
}
