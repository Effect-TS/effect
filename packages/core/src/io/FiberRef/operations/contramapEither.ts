import { Either } from "../../../data/Either"
import type { XFiberRef } from "../definition"

/**
 * Transforms the `set` value of the `XFiberRef` with the specified fallible
 * function.
 *
 * @tsplus fluent ets/XFiberRef contramapEither
 * @tsplus fluent ets/XFiberRefRuntime contramapEither
 */
export function contramapEither_<EA, EB, A, B, EC, C>(
  self: XFiberRef<EA, EB, A, B>,
  f: (c: C) => Either<EC, A>
): XFiberRef<EA | EC, EB, C, B> {
  return self.dimapEither(f, Either.right)
}

/**
 * Transforms the `set` value of the `XFiberRef` with the specified fallible
 * function.
 *
 * @ets_data_first contramapEither_
 */
export function contramapEither<EC, A, C>(f: (c: C) => Either<EC, A>) {
  return <EA, EB, B>(self: XFiberRef<EA, EB, A, B>): XFiberRef<EA | EC, EB, C, B> =>
    self.contramapEither(f)
}
