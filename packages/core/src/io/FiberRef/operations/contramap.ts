import { Either } from "../../../data/Either"
import type { XFiberRef } from "../definition"

/**
 * Transforms the `set` value of the `XFiberRef` with the specified function.
 *
 * @tsplus fluent ets/XFiberRef contramap
 * @tsplus fluent ets/XFiberRefRuntime contramap
 */
export function contramap_<EA, EB, A, B, C>(
  self: XFiberRef<EA, EB, A, B>,
  f: (c: C) => A
): XFiberRef<EA, EB, C, B> {
  return self.contramapEither((c) => Either.right(f(c)))
}

/**
 * Transforms the `set` value of the `XFiberRef` with the specified function.
 *
 * @ets_data_first contramap_
 */
export function contramap<C, A>(f: (c: C) => A) {
  return <EA, EB, B>(self: XFiberRef<EA, EB, A, B>): XFiberRef<EA, EB, C, B> =>
    self.contramap(f)
}
