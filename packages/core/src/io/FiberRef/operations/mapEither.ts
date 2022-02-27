import { Either } from "../../../data/Either"
import type { XFiberRef } from "../definition"

/**
 * Transforms the `get` value of the `XFiberRef` with the specified fallible
 * function.
 *
 * @tsplus fluent ets/XFiberRef mapEither
 * @tsplus fluent ets/XFiberRefRuntime mapEither
 */
export function mapEither_<EA, EB, A, B, EC, C>(
  self: XFiberRef<EA, EB, A, B>,
  f: (b: B) => Either<EC, C>
): XFiberRef<EA, EB | EC, A, C> {
  return self.dimapEither(Either.right, f)
}

/**
 * Transforms the `get` value of the `XFiberRef` with the specified fallible
 * function.
 *
 * @ets_data_first mapEither_
 */
export function mapEither<B, EC, C>(f: (b: B) => Either<EC, C>) {
  return <EA, EB, A>(self: XFiberRef<EA, EB, A, B>): XFiberRef<EA, EB | EC, A, C> =>
    self.mapEither(f)
}
