import { Either } from "../../../data/Either"
import type { XFiberRef } from "../definition"

/**
 * Transforms the `get` value of the `XFiberRef` with the specified function.
 *
 * @tsplus fluent ets/XFiberRef map
 * @tsplus fluent ets/XFiberRefRuntime map
 */
export function map_<EA, EB, A, B, C>(
  self: XFiberRef<EA, EB, A, B>,
  f: (b: B) => C
): XFiberRef<EA, EB, A, C> {
  return self.mapEither((b) => Either.right(f(b)))
}

/**
 * Transforms the `get` value of the `XFiberRef` with the specified function.
 *
 * @ets_data_first map_
 */
export function map<B, C>(f: (b: B) => C) {
  return <EA, EB, A>(self: XFiberRef<EA, EB, A, B>): XFiberRef<EA, EB, A, C> =>
    self.map(f)
}
